import { afterEach, describe, expect, it } from 'vitest';
import { loadAnnotations, removeAnnotations, saveAnnotations } from './storage';

const originalLocalStorage = globalThis.localStorage;

function createStorageMock() {
  const data = new Map<string, string>();
  return {
    getItem(key: string) {
      return data.has(key) ? data.get(key)! : null;
    },
    setItem(key: string, value: string) {
      data.set(key, value);
    },
    removeItem(key: string) {
      data.delete(key);
    },
    clear() {
      data.clear();
    },
  };
}

describe('storage', () => {
  afterEach(() => {
    if (originalLocalStorage) {
      Object.defineProperty(globalThis, 'localStorage', {
        value: originalLocalStorage,
        configurable: true,
      });
    } else {
      Reflect.deleteProperty(globalThis, 'localStorage');
    }
  });

  it('persists annotations by score hash', () => {
    const localStorage = createStorageMock();
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorage,
      configurable: true,
    });

    const annotations = [
      {
        id: 'a1',
        scoreHash: 'hash-1',
        measureIndex: 3,
        content: 'Practice this slowly',
        createdAt: '2026-04-18T00:00:00.000Z',
        updatedAt: '2026-04-18T00:00:00.000Z',
      },
    ];

    saveAnnotations('hash-1', annotations);
    expect(loadAnnotations('hash-1')).toEqual(annotations);

    removeAnnotations('hash-1');
    expect(loadAnnotations('hash-1')).toEqual([]);
  });
});

