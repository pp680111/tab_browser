export type ViewMode = 'tab' | 'standard';

export interface ScoreDocument {
  id: string;
  filePath: string | null;
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

export interface TrackSummary {
  index: number;
  name: string;
  shortName: string;
  isPercussion: boolean;
  isVisibleOnMultiTrack: boolean;
  staffCount: number;
}

export interface TrackControlState {
  muted: boolean;
  solo: boolean;
  volume: number;
}

export interface Annotation {
  id: string;
  scoreHash: string;
  measureIndex: number;
  content: string;
  createdAt: string;
  updatedAt: string;
}

