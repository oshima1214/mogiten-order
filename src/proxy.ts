import { NextResponse, type NextRequest } from 'next/server';
import { isStaffRequest } from '@/lib/auth/requireStaff';

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === '/staff/login') return NextResponse.next();
  if (await isStaffRequest(request)) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = '/staff/login';
  url.search = `?next=${encodeURIComponent(request.nextUrl.pathname)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/staff', '/staff/:path*', '/admin', '/admin/:path*'],
};
