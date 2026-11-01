import { db } from './db';
import { hashPin } from './utils';

const validPin = (pin: string) => /^\d{6}$/.test(pin);

export async function verifyPin(pin: string) {
  const settings = await db.settings.get('main');
  return Boolean(validPin(pin) && settings?.pinSalt && settings.pinHash &&
    await hashPin(pin, settings.pinSalt) === settings.pinHash);
}

/** Always authenticate changes, even if the current session is unlocked. */
export async function savePin(pin: string, oldPin?: string) {
  if (!validPin(pin)) throw new Error('Le PIN doit contenir six chiffres.');
  const settings = await db.settings.get('main') ?? { id: 'main' as const, profile: '' };
  if (settings.pinHash && (!oldPin || !await verifyPin(oldPin))) throw new Error('PIN actuel incorrect.');
  const pinSalt = crypto.randomUUID();
  await db.settings.put({ ...settings, pinSalt, pinHash: await hashPin(pin, pinSalt) });
}

/** A forgotten PIN cannot preserve private records, including trashed ones. */
export async function resetPinAndDeletePrivateDreams() {
  return db.transaction('rw', db.dreams, db.audio, db.settings, async () => {
    const privateIds = (await db.dreams.toArray()).filter((dream) => dream.isPrivate).map((dream) => dream.id);
    await db.audio.bulkDelete(privateIds);
    await db.dreams.bulkDelete(privateIds);
    const settings = await db.settings.get('main');
    if (settings) {
      const { pinHash, pinSalt, ...rest } = settings;
      await db.settings.put(rest);
    }
    return privateIds.length;
  });
}
