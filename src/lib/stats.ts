import type { Category, Dream, NamedCount, StatsSummary } from './types';
import { normalise } from './utils';

function tally(values: string[]): NamedCount[] {
  const counts = new Map<string, NamedCount>();
  for (const label of values) {
    const key = normalise(label);
    const current = counts.get(key);
    if (current) current.count++;
    else counts.set(key, { label, count: 1 });
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'fr'));
}

export function makeStats(dreams: Dream[], categories: Category[]): StatsSummary {
  const list = dreams.filter((dream) => dream.analysis);
  const names = new Map(categories.map((category) => [category.id, category.name]));
  const values = (key: keyof NonNullable<Dream['analysis']>) => list.flatMap((dream) => dream.analysis?.[key] as string[] ?? []);
  const pairs = list.flatMap((dream) => {
    const characters = dream.analysis?.characters ?? [];
    return characters.flatMap((first, index) => characters.slice(index + 1).map((second) => [first, second].sort((a, b) => a.localeCompare(b, 'fr')).join(' + ')));
  });
  return {
    dreamCount: list.length,
    averageDetail: list.length ? list.reduce((total, dream) => total + (dream.analysis?.detailLevel ?? 0), 0) / list.length : 0,
    averageWords: list.length ? list.reduce((total, dream) => total + dream.cleanedText.trim().split(/\s+/).filter(Boolean).length, 0) / list.length : 0,
    byCategory: tally(list.map((dream) => names.get(dream.categoryId) ?? 'Sans catégorie')),
    characters: tally(values('characters')),
    places: tally(values('places')),
    themes: tally(values('themes')),
    feelings: tally(values('feelings')),
    pairs: tally(pairs)
  };
}
