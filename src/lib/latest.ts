export const STALE = Symbol('stale');

/**
 * Wraps overlapping requests (poll, change signal, after an action) so only the
 * most recently started one is applied; older ones resolve to STALE.
 */
export function latestOnly() {
  let seq = 0;
  return async <T>(promise: Promise<T>): Promise<T | typeof STALE> => {
    const mine = ++seq;
    const value = await promise;
    return mine === seq ? value : STALE;
  };
}
