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
  it('éclaircit progressivement la couleur selon le niveau de détail', () => {
    const colors = ([1, 2, 3, 4, 5] as const).map((detailLevel) => {
      const analysis = analysisSchema.parse({ title: 'Un rêve', detailLevel, schemaVersion: 1 });
      return dreamColor({ ...dream, analysis }, categories);
    });
    expect(colors).toEqual(['#1f6888', '#2b92c0', '#38bdf8', '#5cc9f9', '#80d5fb']);
    const analysis = analysisSchema.parse({ title: 'Un rêve', detailLevel: 5, schemaVersion: 1 });
    expect(dreamColor({ ...dream, analysis, status: 'a_valider' }, categories)).toBe('#f87171');
    expect(dreamColor({ ...dream, analysis, analysisStale: true }, categories)).toBe('#f87171');
  });
  it('ne révèle pas le niveau de détail des rêves privés verrouillés', () => {
    const analysis = analysisSchema.parse({ title: 'Un rêve', detailLevel: 1, schemaVersion: 1 });
    const privateDream = { ...dream, analysis, isPrivate: true };
    expect(dreamColor(privateDream, categories)).toBe('#38bdf8');
    expect(dreamColor(privateDream, categories, true)).toBe('#1f6888');
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
