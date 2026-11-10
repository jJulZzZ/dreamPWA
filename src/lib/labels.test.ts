import { describe, expect, it } from 'vitest';
import { collectLabels } from './labels';
import type { Dream } from './types';

function dream(characters: string[], isPrivate = false, deletedAt?: string): Dream {
  return { id: characters.join(), date: '2026-01-01', createdAt: '', updatedAt: '', captureMode: 'texte', cleanedText: '', categoryId: 'normal', isPrivate, status: 'analyse', deletedAt,
    analysis: { title: 'Rêve', characters, places: [], themes: [], keywords: [], feelings: [], detailLevel: 3, schemaVersion: 1 } };
}

describe('collectLabels', () => {
  it('sorts and deduplicates labels while excluding deleted and private dreams', () => {
    const dreams = [dream([' Zoé ', 'Alice']), dream(['alice', 'Bob']), dream(['Secret'], true), dream(['Corbeille'], false, '2026-01-02')];
    expect(collectLabels(dreams, false).characters).toEqual(['Alice', 'Bob', 'Zoé']);
    expect(collectLabels(dreams, true).characters).toEqual(['Alice', 'Bob', 'Secret', 'Zoé']);
  });
});
