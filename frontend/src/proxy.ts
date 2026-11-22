import { SESSION_COOKIE_NAME } from '@greenforce/shared';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * Navigation guard (UX only): sends visitors without a session cookie to /login.
 * Authorization is enforced by the API on every request; this never trusts the cookie's content.
 */
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has(SESSION_COOKIE_NAME);
  const { pathname, search } = request.nextUrl;

  // /login is always reachable: a stale cookie must not cause a redirect loop.
  if (pathname === '/login') return NextResponse.next();
  if (!hasSession) {
    const login = new URL('/login', request.url);
    login.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  // Everything except the API rewrite, Next internals and static files.
  matcher: ['/((?!api/|_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|ico)$).*)'],
};
