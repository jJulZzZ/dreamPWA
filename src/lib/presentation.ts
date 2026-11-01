import type { Category, Dream } from './types';

export function needsProcessing(dream: Dream) {
  return dream.status !== 'analyse' || Boolean(dream.analysisStale);
}

export function dreamColor(dream: Dream, categories: Category[]) {
  return needsProcessing(dream) ? '#f87171' : categories.find((category) => category.id === dream.categoryId)?.color ?? '#8b5cf6';
}

export function dreamTitle(dream: Dream, unlocked: boolean) {
  if (dream.isPrivate && !unlocked) return 'Rêve privé';
  return dream.analysis?.title || dream.cleanedText.slice(0, 76) || 'Enregistrement vocal';
}
