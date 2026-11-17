import { db } from './db';
import type { BackupFile, Category, Dream, Settings } from './types';

export function createBackup(dreams: Dream[], categories: Category[], settings: Settings, exportedAt: string): BackupFile {
  return { format: 'reveil-backup', version: 1, exportedAt, dreams, categories, settings: { profile: settings.profile, pinSalt: settings.pinSalt, pinHash: settings.pinHash } };
}

export async function restoreBackup(backup: BackupFile, replace: boolean) {
  await db.transaction('rw', db.dreams, db.categories, db.settings, async () => {
    if (replace) {
      await db.dreams.clear();
      await db.categories.clear();
      await db.categories.bulkPut(backup.categories);
      await db.dreams.bulkPut(backup.dreams);
      await db.settings.put({ id: 'main', ...backup.settings });
    } else {
      await db.categories.bulkPut(backup.categories);
      for (const dream of backup.dreams) if (!await db.dreams.get(dream.id)) await db.dreams.put(dream);
      const current = await db.settings.get('main');
      if (!current?.pinHash && backup.settings.pinHash && backup.settings.pinSalt) {
        await db.settings.put({ ...(current ?? { id: 'main', profile: '' }), pinHash: backup.settings.pinHash, pinSalt: backup.settings.pinSalt });
      }
    }
  });
}
