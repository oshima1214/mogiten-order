// Staff session tokens: "<expiresAtMs>.<hex HMAC-SHA256 of expiresAtMs>".
// Uses Web Crypto only, so it runs in proxy.ts and in Route Handlers alike.

export const SESSION_COOKIE = 'staff_session';
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

const encoder = new TextEncoder();

async function sign(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ]);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
}

export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSessionToken(secret: string, nowMs: number): Promise<string> {
  if (!secret) throw new Error('SESSION_SECRET is not set');
  const expires = String(nowMs + SESSION_TTL_MS);
  return `${expires}.${await sign(secret, expires)}`;
}

export async function verifySessionToken(token: string | undefined, secret: string, nowMs: number): Promise<boolean> {
  if (!token || !secret) return false;
  const [expires, sig, ...rest] = token.split('.');
  if (rest.length || !expires || !sig || !/^\d+$/.test(expires)) return false;
  if (Number(expires) < nowMs) return false;
  return constantTimeEqual(sig, await sign(secret, expires));
}
