import type { Annotation } from '../types';

const PREFIX = 'guitar-tabs.annotations.v1';

function storageKey(scoreHash: string) {
  return `${PREFIX}.${scoreHash}`;
}

export function loadAnnotations(scoreHash: string): Annotation[] {
  const raw = localStorage.getItem(storageKey(scoreHash));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Annotation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAnnotations(scoreHash: string, annotations: Annotation[]) {
  localStorage.setItem(storageKey(scoreHash), JSON.stringify(annotations));
}

export function removeAnnotations(scoreHash: string) {
  localStorage.removeItem(storageKey(scoreHash));
}

