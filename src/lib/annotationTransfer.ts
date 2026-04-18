import type { Annotation } from '../types';

export interface AnnotationBundle {
  version: 1;
  scoreHash: string;
  exportedAt: string;
  annotations: Annotation[];
}

export function createAnnotationBundle(scoreHash: string, annotations: Annotation[]): AnnotationBundle {
  return {
    version: 1,
    scoreHash,
    exportedAt: new Date().toISOString(),
    annotations,
  };
}

export function parseAnnotationBundle(input: string): AnnotationBundle | null {
  try {
    const parsed = JSON.parse(input) as Partial<AnnotationBundle>;
    if (
      parsed?.version !== 1 ||
      typeof parsed.scoreHash !== 'string' ||
      typeof parsed.exportedAt !== 'string' ||
      !Array.isArray(parsed.annotations)
    ) {
      return null;
    }

    return {
      version: 1,
      scoreHash: parsed.scoreHash,
      exportedAt: parsed.exportedAt,
      annotations: parsed.annotations as Annotation[],
    };
  } catch {
    return null;
  }
}

