import 'fake-indexeddb/auto';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createBackup, restoreBackup } from './backup';
import { db } from './db';
import { savePin, verifyPin } from './privacy';
import type { Dream, Settings } from './types';

const dream = (id: string, isPrivate: boolean, deletedAt?: string): Dream => ({
  id, isPrivate, deletedAt, date: '2026-11-01', createdAt: '', updatedAt: '',
  categoryId: 'normal', status: 'analyse', captureMode: 'texte', cleanedText: 'Un rêve'
});

beforeEach(async () => {
  await db.dreams.clear(); await db.categories.clear(); await db.settings.clear();
  await db.settings.put({ id: 'main', profile: 'Profil initial' });
});
afterAll(() => db.close());

describe('sauvegarde des rêves privés', () => {
  it.each([true, false])('préserve les rêves privés et leur PIN sur un nouvel appareil (remplacer : %s)', async (replace) => {
    await savePin('123456');
    const settings = (await db.settings.get('main')) as Settings;
    const backup = JSON.parse(JSON.stringify(createBackup([
      dream('public', false), dream('private', true), dream('trash', true, '2026-11-01')
    ], [], settings, '2026-11-17')));
    await db.settings.clear();
    await db.settings.put({ id: 'main', profile: 'Nouveau profil' });

    await restoreBackup(backup, replace);
    expect((await db.dreams.get('private'))?.isPrivate).toBe(true);
    expect(await db.dreams.get('trash')).toMatchObject({ isPrivate: true, deletedAt: '2026-11-01' });
    expect(await verifyPin('123456')).toBe(true);
  });

  it('conserve le PIN local lors d’une fusion sur un appareil déjà configuré', async () => {
    await savePin('123456');
    const backup = createBackup([dream('private', true)], [], (await db.settings.get('main'))!, '');
    await savePin('654321', '123456');
    await restoreBackup(backup, false);
    expect(await verifyPin('654321')).toBe(true);
    expect(await verifyPin('123456')).toBe(false);
    expect((await db.dreams.get('private'))?.isPrivate).toBe(true);
  });
});
