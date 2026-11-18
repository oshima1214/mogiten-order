export const STALE = Symbol('stale');

export type LatestOnly = (<T>(promise: Promise<T>) => Promise<T | typeof STALE>) & {
  /** Marks every request already in flight as stale (e.g. after an optimistic update). */
  invalidate(): void;
};

/**
 * Wraps overlapping requests (poll, change signal, after an action) so only the
 * most recently started one is applied; older ones resolve to STALE.
 */
export function latestOnly(): LatestOnly {
  let seq = 0;
  const run = async <T>(promise: Promise<T>): Promise<T | typeof STALE> => {
    const mine = ++seq;
    const value = await promise;
    return mine === seq ? value : STALE;
  };
  return Object.assign(run, {
    invalidate() {
      seq++;
    },
  });
}
