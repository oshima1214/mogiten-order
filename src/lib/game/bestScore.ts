export const BEST_KEY = 'mogiten_gyoza_best';

/** Personal best kept on this phone only; falls back to memory when storage is unavailable. */
export function createBestStore(storage: Storage | null) {
  let memory = 0;
  const read = (): number => {
    try {
      const n = Number(storage?.getItem(BEST_KEY));
      return Number.isInteger(n) && n > 0 ? n : 0;
    } catch {
      return 0;
    }
  };
  return {
    load(): number {
      return Math.max(memory, read());
    },
    save(score: number): number {
      const best = Math.max(this.load(), score);
      memory = best;
      try {
        storage?.setItem(BEST_KEY, String(best));
      } catch {
        /* memory keeps it */
      }
      return best;
    },
  };
}

export function browserBestStore() {
  let storage: Storage | null = null;
  try {
    storage = typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    storage = null;
  }
  return createBestStore(storage);
}
