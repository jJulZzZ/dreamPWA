import type { Category, Dream } from './types';

export function needsProcessing(dream: Dream) {
  return dream.status !== 'analyse' || Boolean(dream.analysisStale);
}

export function dreamColor(dream: Dream, categories: Category[], unlocked = false) {
  if (needsProcessing(dream)) return '#f87171';
  const color = categories.find((category) => category.id === dream.categoryId)?.color ?? '#8b5cf6';
  const level = dream.analysis?.detailLevel;
  if (!level || level === 3 || (dream.isPrivate && !unlocked)) return color;

  // Keep the category's hue: shade low scores toward black and high scores toward white.
  const amount = { 1: 0.45, 2: 0.225, 4: 0.18, 5: 0.36 }[level];
  const target = level < 3 ? 0 : 255;
  const hex = /^#([\da-f]{3}|[\da-f]{6})$/i.exec(color)?.[1];
  if (!hex) return `color-mix(in srgb, ${color} ${(1 - amount) * 100}%, ${target ? 'white' : 'black'})`;
  const full = hex.length === 3 ? [...hex].map((digit) => digit + digit).join('') : hex;
  const channels = full.match(/.{2}/g)!.map((channel) => Math.round(parseInt(channel, 16) * (1 - amount) + target * amount));
  return `#${channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

export function dreamTitle(dream: Dream, unlocked: boolean) {
  if (dream.isPrivate && !unlocked) return 'Rêve privé';
  return dream.analysis?.title || dream.cleanedText.slice(0, 76) || 'Enregistrement vocal';
}
