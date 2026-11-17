export const TOKEN_KEY = 'mogiten_order_token';

export type TokenStore = {
  load(): string | null;
  save(token: string): void;
  clear(): void;
  /** false when the token only lives in memory (closing the tab loses the order). */
  readonly persistent: boolean;
};

function probe(storage: Storage | null): boolean {
  if (!storage) return false;
  try {
    storage.setItem(`${TOKEN_KEY}__probe`, '1');
    storage.removeItem(`${TOKEN_KEY}__probe`);
    return true;
  } catch {
    return false;
  }
}

export function createTokenStore(storage: Storage | null): TokenStore {
  const persistent = probe(storage);
  let memory: string | null = null;
  return {
    persistent,
    load() {
      if (persistent) {
        try {
          return storage!.getItem(TOKEN_KEY);
        } catch {
          /* fall through to memory */
        }
      }
      return memory;
    },
    save(token) {
      memory = token;
      if (persistent) {
        try {
          storage!.setItem(TOKEN_KEY, token);
        } catch {
          /* memory already holds it */
        }
      }
    },
    clear() {
      memory = null;
      if (persistent) {
        try {
          storage!.removeItem(TOKEN_KEY);
        } catch {
          /* nothing to do */
        }
      }
    },
  };
}

export function browserTokenStore(): TokenStore {
  let storage: Storage | null = null;
  try {
    storage = typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    storage = null;
  }
  return createTokenStore(storage);
}
