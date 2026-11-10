import type { Dream, DreamAnalysis } from './types';
import { uniqueLabels } from './utils';

export type AnalysisLabels = Pick<DreamAnalysis, 'characters' | 'places' | 'themes' | 'keywords' | 'feelings'>;
export const labelKeys = ['characters', 'places', 'themes', 'keywords', 'feelings'] as const;

/** Private labels are only available when editing a private dream in an unlocked session. */
export function collectLabels(dreams: Dream[], includePrivate: boolean): AnalysisLabels {
  const result: AnalysisLabels = { characters: [], places: [], themes: [], keywords: [], feelings: [] };
  for (const dream of dreams) {
    if (dream.deletedAt || (dream.isPrivate && !includePrivate) || !dream.analysis) continue;
    for (const key of labelKeys) result[key].push(...dream.analysis[key]);
  }
  for (const key of labelKeys) result[key] = uniqueLabels(result[key]).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
  return result;
}
