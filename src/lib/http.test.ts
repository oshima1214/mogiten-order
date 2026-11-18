import { afterEach, describe, expect, it, vi } from 'vitest';
import { ACTION_TIMEOUT_MS, postJson } from './http';

afterEach(() => vi.useRealTimers());

/** A fetch that never answers unless its signal aborts — like a stalled request on bad Wi-Fi. */
const hangingFetch: typeof fetch = (_url, init) =>
  new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new DOMException('timed out', 'TimeoutError')));
  });

describe('postJson', () => {
  it('waits 8 seconds before giving up', () => expect(ACTION_TIMEOUT_MS).toBe(8000));

  it('returns null when the server does not answer in time', async () => {
    const result = postJson('/x', { a: 1 }, { fetchImpl: hangingFetch, timeoutMs: 20 });
    await expect(result).resolves.toBeNull();
  });

  it('returns the response and sends JSON', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 204 })) as unknown as typeof fetch;
    const res = await postJson('/x', { a: 1 }, { fetchImpl });
    expect(res?.status).toBe(204);
    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('/x');
    expect(init).toMatchObject({ method: 'POST', body: '{"a":1}', headers: { 'content-type': 'application/json' } });
  });

  it('returns null on a network error', async () => {
    const fetchImpl = (async () => {
      throw new TypeError('Failed to fetch');
    }) as typeof fetch;
    await expect(postJson('/x', {}, { fetchImpl })).resolves.toBeNull();
  });
});
