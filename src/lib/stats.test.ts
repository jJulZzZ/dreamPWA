import { describe, expect, it } from 'vitest';
import { makeStats } from './stats';
import { normalise, uniqueLabels } from './utils';
import type { Dream } from './types';

const categories = [{ id: 'normal', name: 'Normal', color: '#fff' }];
const dream = (id: string, characters: string[]): Dream => ({
  id, date: '2026-10-29', createdAt: '', updatedAt: '', captureMode: 'texte', cleanedText: 'Un texte de rêve.',
  categoryId: 'normal', isPrivate: false, status: 'analyse',
  analysis: { characters, places: [], themes: [], keywords: [], feelings: [], detailLevel: 3, schemaVersion: 1 }
});

describe('normalisation et statistiques', () => {
  it('regroupe les variantes de casse tout en préservant le premier libellé', () => {
    expect(uniqueLabels(['Lucien', ' lucien ', 'LUCIEN'])).toEqual(['Lucien']);
    expect(normalise('  Les   Gars ')).toBe('les gars');
  });

  it('compte les personnages et cooccurrences', () => {
    const result = makeStats([dream('a', ['Lucien', 'Paul']), dream('b', ['lucien'])], categories);
    expect(result.characters[0]).toEqual({ label: 'Lucien', count: 2 });
    expect(result.pairs).toEqual([{ label: 'Lucien + Paul', count: 1 }]);
  });
});
