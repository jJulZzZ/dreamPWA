import { describe, expect, it } from 'vitest';
import { analysisSchema } from './schema';
import { dreamColor, dreamTitle } from './presentation';
import type { Dream, DreamStatus } from './types';

const dream: Dream = { id: '1', date: '', createdAt: '', updatedAt: '', captureMode: 'texte', cleanedText: 'Un ancien rêve', categoryId: 'lucide', isPrivate: false, status: 'analyse' };
const categories = [{ id: 'lucide', name: 'Lucide', color: '#38bdf8' }];

describe('présentation du journal', () => {
  it.each<DreamStatus>(['a_transcrire', 'a_nettoyer', 'a_analyser', 'a_valider', 'erreur'])('impose le rouge pour %s, quelle que soit la catégorie', (status) => {
    expect(dreamColor({ ...dream, status }, categories)).toBe('#f87171');
  });
  it('retrouve la couleur de catégorie après validation et signale une analyse obsolète', () => {
    expect(dreamColor(dream, categories)).toBe('#38bdf8');
    expect(dreamColor({ ...dream, analysisStale: true }, categories)).toBe('#f87171');
  });
  it('accepte le titre IA, conserve les anciens rêves et masque les titres privés', () => {
    const analysis = analysisSchema.parse({ title: 'La maison volante', detailLevel: 3, schemaVersion: 1 });
    expect(dreamTitle({ ...dream, analysis }, false)).toBe('La maison volante');
    expect(dreamTitle(dream, false)).toBe('Un ancien rêve');
    expect(dreamTitle({ ...dream, analysis, isPrivate: true }, false)).toBe('Rêve privé');
    expect(dreamTitle({ ...dream, analysis, isPrivate: true }, true)).toBe('La maison volante');
    expect(() => analysisSchema.parse({ title: '', detailLevel: 3, schemaVersion: 1 })).toThrow();
  });
});
