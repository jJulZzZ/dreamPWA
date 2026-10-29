import Dexie, { type Table } from 'dexie';
import type { AudioRecord, Category, Dream, Settings } from './types';

export class DreamDatabase extends Dexie {
  dreams!: Table<Dream, string>;
  categories!: Table<Category, string>;
  audio!: Table<AudioRecord, string>;
  settings!: Table<Settings, string>;

  constructor() {
    super('reveil-journal');
    this.version(1).stores({
      dreams: 'id, date, categoryId, status, isPrivate, deletedAt, updatedAt',
      categories: 'id, name',
      audio: 'dreamId',
      settings: 'id'
    });
  }
}

export const db = new DreamDatabase();

export const defaultCategories: Category[] = [
  { id: 'normal', name: 'Normal', color: '#8b5cf6', isSystem: true },
  { id: 'lucide', name: 'Lucide', color: '#38bdf8', isSystem: true },
  { id: 'scenario', name: 'Scénario', color: '#f472b6', isSystem: true }
];

export async function initialiseDatabase() {
  if (await db.categories.count() === 0) await db.categories.bulkAdd(defaultCategories);
  if (!await db.settings.get('main')) await db.settings.put({ id: 'main', profile: '' });
  const expiry = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  await db.dreams.where('deletedAt').below(expiry).delete();
}
