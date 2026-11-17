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
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

export function parseFrenchDate(value: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (year < 1000 || month < 1 || month > 12 || day < 1) return null;
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day > daysInMonth) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

export const detailLabels = ['Fragments vagues', 'Bribe de rêve', 'Récit cohérent', 'Récit riche', 'Très descriptif'];
