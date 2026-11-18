import { describe, expect, it } from 'vitest';
import { latestOnly, STALE } from './latest';

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

describe('latestOnly', () => {
  it('passes a single result through', async () => {
    const run = latestOnly();
    expect(await run(Promise.resolve('a'))).toBe('a');
  });

  it('marks an older response that finishes last as stale', async () => {
    const run = latestOnly();
    const first = deferred<string>();
    const second = deferred<string>();
    const p1 = run(first.promise);
    const p2 = run(second.promise);
    second.resolve('new');
    first.resolve('old');
    expect(await p2).toBe('new');
    expect(await p1).toBe(STALE);
  });

  it('marks an older response that finishes first as stale too', async () => {
    const run = latestOnly();
    const first = deferred<string>();
    const second = deferred<string>();
    const p1 = run(first.promise);
    const p2 = run(second.promise);
    first.resolve('old');
    second.resolve('new');
    expect(await p1).toBe(STALE);
    expect(await p2).toBe('new');
  });

  it('invalidate() discards responses started before it', async () => {
    const run = latestOnly();
    const first = deferred<string>();
    const p1 = run(first.promise);
    run.invalidate();
    const p2 = run(Promise.resolve('after'));
    first.resolve('before');
    expect(await p1).toBe(STALE);
    expect(await p2).toBe('after');
  });
});
