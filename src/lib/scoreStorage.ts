import type { ViewMode } from '../types';

const SCORE_LIBRARY_KEY = 'guitar-tabs.score-library.v1';
const SCORE_BYTES_PREFIX = 'guitar-tabs.score-bytes.v1';

export interface ScoreLibraryEntry {
  id: string;
  filePath: string | null;
  fileName: string;
  fileHash: string;
  viewMode: ViewMode;
  measureCount: number;
  title?: string;
  artist?: string;
  createdAt: string;
  lastOpenedAt: string;
}

function now() {
  return new Date().toISOString();
}

function storageKey(id: string) {
  return `${SCORE_BYTES_PREFIX}.${id}`;
}

function isScoreLibraryEntry(value: unknown): value is ScoreLibraryEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Record<string, unknown>;

  return (
    typeof entry.id === 'string' &&
    (typeof entry.filePath === 'string' || entry.filePath === null) &&
    typeof entry.fileName === 'string' &&
    typeof entry.fileHash === 'string' &&
    (entry.viewMode === 'tab' || entry.viewMode === 'standard') &&
    typeof entry.measureCount === 'number' &&
    typeof entry.createdAt === 'string' &&
    typeof entry.lastOpenedAt === 'string'
  );
}

export function getScoreLibraryEntryId(filePath: string | null, fileHash: string) {
  return filePath?.trim() || fileHash;
}

export function loadScoreLibrary(): ScoreLibraryEntry[] {
  const raw = localStorage.getItem(SCORE_LIBRARY_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isScoreLibraryEntry).sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt));
  } catch {
    return [];
  }
}

export function saveScoreLibrary(entries: ScoreLibraryEntry[]) {
  localStorage.setItem(SCORE_LIBRARY_KEY, JSON.stringify(entries));
}

export function upsertScoreLibraryEntry(
  entries: ScoreLibraryEntry[],
  entry: Omit<ScoreLibraryEntry, 'createdAt' | 'lastOpenedAt'> & {
    createdAt?: string;
    lastOpenedAt?: string;
  }
) {
  const timestamp = now();
  const existingIndex = entries.findIndex((item) => item.id === entry.id);
  const nextEntry: ScoreLibraryEntry =
    existingIndex >= 0
      ? {
          ...entries[existingIndex],
          ...entry,
          createdAt: entries[existingIndex].createdAt,
          lastOpenedAt: entry.lastOpenedAt ?? timestamp,
        }
      : {
          ...entry,
          createdAt: entry.createdAt ?? timestamp,
          lastOpenedAt: entry.lastOpenedAt ?? timestamp,
        };

  const next = [...entries];
  if (existingIndex >= 0) {
    next.splice(existingIndex, 1, nextEntry);
  } else {
    next.push(nextEntry);
  }

  next.sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt));
  return next;
}

export function updateScoreLibraryEntry(
  entries: ScoreLibraryEntry[],
  id: string,
  patch: Partial<Omit<ScoreLibraryEntry, 'id' | 'createdAt' | 'lastOpenedAt'>>
) {
  const existing = entries.find((entry) => entry.id === id);
  if (!existing) return entries;
  return upsertScoreLibraryEntry(entries, {
    ...existing,
    ...patch,
    lastOpenedAt: now(),
  });
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary);
}

function base64ToBytes(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

export function loadCachedScoreBytes(id: string): Uint8Array | null {
  const raw = localStorage.getItem(storageKey(id));
  if (!raw) return null;

  try {
    return base64ToBytes(raw);
  } catch {
    return null;
  }
}

export function saveCachedScoreBytes(id: string, bytes: Uint8Array) {
  try {
    localStorage.setItem(storageKey(id), bytesToBase64(bytes));
    return true;
  } catch {
    return false;
  }
}

export function removeCachedScoreBytes(id: string) {
  localStorage.removeItem(storageKey(id));
}
