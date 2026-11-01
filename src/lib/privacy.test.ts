import 'fake-indexeddb/auto';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { resetPinAndDeletePrivateDreams, savePin, verifyPin } from './privacy';
import type { Dream } from './types';

const dream = (id: string, isPrivate: boolean, deletedAt?: string): Dream => ({
  id, isPrivate, deletedAt, date: '2026-11-01', createdAt: '', updatedAt: '',
  categoryId: 'normal', status: 'a_transcrire', captureMode: 'vocal', cleanedText: ''
});

beforeEach(async () => {
  await db.dreams.clear(); await db.audio.clear(); await db.settings.clear();
  await db.settings.put({ id: 'main', profile: 'Profil conservé' });
});
afterAll(() => db.close());

describe('cycle du PIN', () => {
  it('crée un PIN salé et exige le PIN actuel pour tout changement', async () => {
    await savePin('123456');
    const initial = await db.settings.get('main');
    expect(initial?.pinHash).not.toBe('123456');
    expect(await verifyPin('123456')).toBe(true);
    await expect(savePin('654321')).rejects.toThrow('PIN actuel incorrect');
    await expect(savePin('654321', '000000')).rejects.toThrow('PIN actuel incorrect');
    expect(await verifyPin('123456')).toBe(true);
    await savePin('654321', '123456');
    expect(await verifyPin('123456')).toBe(false);
    expect(await verifyPin('654321')).toBe(true);
    expect((await db.settings.get('main'))?.pinSalt).not.toBe(initial?.pinSalt);
  });

  it('refuse un PIN qui ne contient pas exactement six chiffres', async () => {
    await expect(savePin('1234')).rejects.toThrow();
    await expect(savePin('abcdef')).rejects.toThrow();
    expect((await db.settings.get('main'))?.pinHash).toBeUndefined();
  });

  it('supprime tous les rêves privés et leurs audios, même en corbeille, mais préserve le public et le profil', async () => {
    await savePin('123456');
    await db.dreams.bulkPut([dream('public', false), dream('private', true), dream('trash', true, '2026-11-01')]);
    await db.audio.bulkPut(['public', 'private', 'trash'].map((dreamId) => ({ dreamId, blob: new Blob(['audio']), mimeType: 'audio/webm', createdAt: '' })));
    expect(await resetPinAndDeletePrivateDreams()).toBe(2);
    expect((await db.dreams.toArray()).map((value) => value.id)).toEqual(['public']);
    expect((await db.audio.toArray()).map((value) => value.dreamId)).toEqual(['public']);
    expect(await db.settings.get('main')).toEqual({ id: 'main', profile: 'Profil conservé' });
    await savePin('654321');
    expect(await verifyPin('654321')).toBe(true);
  });
});
