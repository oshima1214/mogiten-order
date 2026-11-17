const ALLOWED = new Set(['/staff', '/staff/sales', '/admin']);

/** Where to go after login: only known staff pages, never another site. */
export function safeNextPath(next: string | null): string {
  return next && ALLOWED.has(next) ? next : '/staff';
}
