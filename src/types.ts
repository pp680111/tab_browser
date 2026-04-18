export type ViewMode = 'tab' | 'standard';

export interface ScoreDocument {
  id: string;
  fileName: string;
  fileHash: string;
  viewMode: ViewMode;
  measureCount: number;
  title?: string;
  artist?: string;
}

export interface MeasurePosition {
  measureIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Annotation {
  id: string;
  scoreHash: string;
  measureIndex: number;
  content: string;
  createdAt: string;
  updatedAt: string;
}

