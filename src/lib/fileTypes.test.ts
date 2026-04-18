import { describe, expect, it } from 'vitest';
import { getFileExtension, isSupportedScoreFile, SUPPORTED_EXTENSIONS } from './fileTypes';

describe('fileTypes', () => {
  it('extracts lowercase extensions', () => {
    expect(getFileExtension('song.GP5')).toBe('gp5');
    expect(getFileExtension('song.musicxml')).toBe('musicxml');
  });

  it('detects supported score files', () => {
    for (const ext of SUPPORTED_EXTENSIONS) {
      expect(isSupportedScoreFile(`demo.${ext}`)).toBe(true);
    }
    expect(isSupportedScoreFile('notes.txt')).toBe(false);
  });
});

