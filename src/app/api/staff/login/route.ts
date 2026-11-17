import { constantTimeEqual, createSessionToken, SESSION_COOKIE, SESSION_TTL_MS } from '@/lib/auth/session';

export async function POST(request: Request) {
  const expected = process.env.STAFF_PASSCODE ?? '';
  const body = (await request.json().catch(() => null)) as { passcode?: unknown } | null;
  const passcode = typeof body?.passcode === 'string' ? body.passcode : '';
  if (!expected || !constantTimeEqual(passcode, expected)) {
    return Response.json({ error: 'invalid_passcode' }, { status: 401 });
  }

  const token = await createSessionToken(process.env.SESSION_SECRET ?? '', Date.now());
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return new Response(null, {
    status: 204,
    headers: {
      'Set-Cookie': `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_MS / 1000}${secure}`,
    },
  });
}
