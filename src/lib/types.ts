export type DreamStatus = 'a_transcrire' | 'a_nettoyer' | 'a_analyser' | 'a_valider' | 'analyse' | 'erreur';
export type CaptureMode = 'texte' | 'vocal';

export interface DreamAnalysis {
  /** Optional only for compatibility with dreams saved before titles existed. */
  title?: string;
  characters: string[];
  places: string[];
  themes: string[];
  keywords: string[];
  feelings: string[];
  detailLevel: 1 | 2 | 3 | 4 | 5;
  schemaVersion: 1;
}

export interface Dream {
  id: string;
  date: string;
  createdAt: string;
  updatedAt: string;
  captureMode: CaptureMode;
  rawText?: string;
  cleanedText: string;
  categoryId: string;
  isPrivate: boolean;
  status: DreamStatus;
  analysis?: DreamAnalysis;
  analysisStale?: boolean;
  error?: string;
  retryStatus?: Exclude<DreamStatus, 'erreur'>;
  deletedAt?: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  isSystem?: boolean;
}

export interface AudioRecord {
  dreamId: string;
  blob: Blob;
  mimeType: string;
  createdAt: string;
}

export interface Settings {
  id: 'main';
  profile: string;
  pinSalt?: string;
  pinHash?: string;
}

export interface BackupFile {
  format: 'reveil-backup';
  version: 1;
  exportedAt: string;
  dreams: Dream[];
  categories: Category[];
  settings: Pick<Settings, 'profile' | 'pinSalt' | 'pinHash'>;
}

export interface NamedCount { label: string; count: number }
export interface StatsSummary {
  dreamCount: number;
  averageDetail: number;
  averageWords: number;
  byCategory: NamedCount[];
  characters: NamedCount[];
  places: NamedCount[];
  themes: NamedCount[];
  feelings: NamedCount[];
  pairs: NamedCount[];
}
