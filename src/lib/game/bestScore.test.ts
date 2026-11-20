import { describe, expect, it } from 'vitest';
import { BEST_KEY, createBestStore } from './bestScore';

function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() {
      return m.size;
    },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, v),
  };
}

const throwing = (): Storage => {
  const boom = () => {
    throw new Error('SecurityError');
  };
  return { length: 0, clear: boom, getItem: boom, key: boom, removeItem: boom, setItem: boom };
};

describe('createBestStore', () => {
  it('uses the agreed key', () => expect(BEST_KEY).toBe('mogiten_gyoza_best'));

  it('starts at 0 and keeps only improvements', () => {
    const storage = memoryStorage();
    const store = createBestStore(storage);
    expect(store.load()).toBe(0);
    expect(store.save(7)).toBe(7);
    expect(store.save(3)).toBe(7);
    expect(createBestStore(storage).load()).toBe(7);
  });

  it('ignores a corrupted stored value', () => {
    const storage = memoryStorage();
    storage.setItem(BEST_KEY, 'abc');
    expect(createBestStore(storage).load()).toBe(0);
  });

  it('works in memory when storage throws or is missing', () => {
    for (const s of [throwing(), null]) {
      const store = createBestStore(s);
      expect(store.save(4)).toBe(4);
      expect(store.load()).toBe(4);
    }
  });
});
