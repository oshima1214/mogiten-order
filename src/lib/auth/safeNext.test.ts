import { describe, expect, it } from 'vitest';
import { safeNextPath } from './safeNext';

describe('safeNextPath', () => {
  it.each(['/staff', '/staff/sales', '/admin'])('allows %s', (p) => expect(safeNextPath(p)).toBe(p));
  it.each([null, '', '//evil.com', '/\\evil.com', 'https://evil.com', '/staff/../x', '/elsewhere', '/admin?x=1'])(
    'falls back to /staff for %j',
    (p) => expect(safeNextPath(p)).toBe('/staff'),
  );
});
