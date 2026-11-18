/** How long a staff action waits for the server before it is treated as failed. */
export const ACTION_TIMEOUT_MS = 8000;

/**
 * POSTs JSON and resolves to the Response, or null on a network error or timeout.
 * The timeout keeps one stalled request (bad festival Wi-Fi) from blocking the board.
 */
export async function postJson(
  url: string,
  body: unknown,
  opts: { fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<Response | null> {
  const { fetchImpl = fetch, timeoutMs = ACTION_TIMEOUT_MS } = opts;
  try {
    return await fetchImpl(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    return null;
  }
}
