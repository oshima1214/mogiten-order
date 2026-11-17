import { describe, expect, it } from 'vitest';
import { createTokenStore, TOKEN_KEY } from './tokenStore';

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

function throwingStorage(): Storage {
  const boom = () => {
    throw new Error('SecurityError');
  };
  return { length: 0, clear: boom, getItem: boom, key: boom, removeItem: boom, setItem: boom };
}

describe('createTokenStore', () => {
  it('saves, loads and clears through storage', () => {
    const storage = memoryStorage();
    const store = createTokenStore(storage);
    expect(store.load()).toBeNull();
    store.save('tok');
    expect(storage.getItem(TOKEN_KEY)).toBe('tok');
    expect(createTokenStore(storage).load()).toBe('tok');
    store.clear();
    expect(store.load()).toBeNull();
  });

  it('uses the expected key', () => expect(TOKEN_KEY).toBe('mogiten_order_token'));

  it('works in memory without storage', () => {
    const store = createTokenStore(null);
    store.save('tok');
    expect(store.load()).toBe('tok');
    expect(store.persistent).toBe(false);
  });

  it('falls back to memory when storage throws', () => {
    const store = createTokenStore(throwingStorage());
    expect(() => store.save('tok')).not.toThrow();
    expect(store.load()).toBe('tok');
    store.clear();
    expect(store.load()).toBeNull();
    expect(store.persistent).toBe(false);
  });

  it('reports persistent storage when it works', () => {
    expect(createTokenStore(memoryStorage()).persistent).toBe(true);
  });
});
