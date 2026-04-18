import { describe, expect, it } from 'vitest';
import { hashBytes } from './fileHash';

describe('fileHash', () => {
  it('creates a deterministic sha-256 hash', async () => {
    const bytes = new TextEncoder().encode('abc');
    await expect(hashBytes(bytes)).resolves.toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    );
  });
});

