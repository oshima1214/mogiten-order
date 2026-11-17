import { describe, expect, it } from 'vitest';
import { createSessionToken, SESSION_TTL_MS, verifySessionToken } from './session';

const SECRET = 'test-secret-0123456789';
const NOW = 1_800_000_000_000;

describe('session tokens', () => {
  it('verifies a fresh token with the same secret', async () => {
    const token = await createSessionToken(SECRET, NOW);
    expect(await verifySessionToken(token, SECRET, NOW + 1000)).toBe(true);
  });

  it('lasts 24 hours', () => expect(SESSION_TTL_MS).toBe(24 * 60 * 60 * 1000));

  it('rejects an expired token', async () => {
    const token = await createSessionToken(SECRET, NOW);
    expect(await verifySessionToken(token, SECRET, NOW + SESSION_TTL_MS + 1)).toBe(false);
  });

  it('rejects a token signed with another secret', async () => {
    const token = await createSessionToken('another-secret', NOW);
    expect(await verifySessionToken(token, SECRET, NOW)).toBe(false);
  });

  it('rejects a tampered signature', async () => {
    const token = await createSessionToken(SECRET, NOW);
    const last = token.at(-1) === '0' ? '1' : '0';
    expect(await verifySessionToken(token.slice(0, -1) + last, SECRET, NOW)).toBe(false);
  });

  it('rejects a tampered expiry', async () => {
    const token = await createSessionToken(SECRET, NOW);
    const [, sig] = token.split('.');
    expect(await verifySessionToken(`${NOW + 10 * SESSION_TTL_MS}.${sig}`, SECRET, NOW)).toBe(false);
  });

  it.each([undefined, '', 'abc', '.', '123.'])('rejects malformed %j', async (token) => {
    expect(await verifySessionToken(token, SECRET, NOW)).toBe(false);
  });

  it('refuses to work without a secret', async () => {
    await expect(createSessionToken('', NOW)).rejects.toThrow('SESSION_SECRET');
    const token = await createSessionToken(SECRET, NOW);
    expect(await verifySessionToken(token, '', NOW)).toBe(false);
  });
});
