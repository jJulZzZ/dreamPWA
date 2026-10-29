import type { DreamAnalysis } from './types';

export const today = () => new Date().toLocaleDateString('en-CA');
export const id = () => crypto.randomUUID();
export const now = () => new Date().toISOString();

export function normalise(value: string) {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('fr-FR');
}

export function uniqueLabels(values: string[], max?: number) {
  const seen = new Set<string>();
  return values.map((value) => value.trim().replace(/\s+/g, ' ')).filter((value) => {
    const key = normalise(value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, max);
}

export function cleanAnalysis(analysis: DreamAnalysis): DreamAnalysis {
  return {
    ...analysis,
    characters: uniqueLabels(analysis.characters),
    places: uniqueLabels(analysis.places),
    themes: uniqueLabels(analysis.themes),
    keywords: uniqueLabels(analysis.keywords, 5),
    feelings: uniqueLabels(analysis.feelings)
  };
}

export async function hashPin(pin: string, salt: string) {
  const bytes = new TextEncoder().encode(`${salt}:${pin}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (part) => part.toString(16).padStart(2, '0')).join('');
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(`${value}T12:00:00`));
}

export const detailLabels = ['Fragments vagues', 'Bribe de rêve', 'Récit cohérent', 'Récit riche', 'Très descriptif'];
