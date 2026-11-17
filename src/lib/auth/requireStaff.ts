import { SESSION_COOKIE, verifySessionToken } from './session';

export function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get('cookie');
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return undefined;
}

export async function isStaffRequest(request: Request): Promise<boolean> {
  return verifySessionToken(readCookie(request, SESSION_COOKIE), process.env.SESSION_SECRET ?? '', Date.now());
}

/** Returns a 401 response when the request has no valid staff session, otherwise null. */
export async function requireStaff(request: Request): Promise<Response | null> {
  if (await isStaffRequest(request)) return null;
  return Response.json({ error: 'unauthorized' }, { status: 401 });
}
