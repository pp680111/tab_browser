import { describe, expect, it } from 'vitest';
import { createAnnotationBundle, parseAnnotationBundle } from './annotationTransfer';

describe('annotationTransfer', () => {
  it('round-trips a bundle', () => {
    const bundle = createAnnotationBundle('hash-1', [
      {
        id: 'a1',
        scoreHash: 'hash-1',
        measureIndex: 2,
        content: 'Practice this passage slowly',
        createdAt: '2026-04-18T00:00:00.000Z',
        updatedAt: '2026-04-18T00:00:00.000Z',
      },
    ]);

    const parsed = parseAnnotationBundle(JSON.stringify(bundle));
    expect(parsed).toEqual(bundle);
  });

  it('rejects invalid payloads', () => {
    expect(parseAnnotationBundle('{}')).toBeNull();
    expect(parseAnnotationBundle('not json')).toBeNull();
  });
});

