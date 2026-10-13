import { NextResponse, type NextRequest } from 'next/server';
import { HOST_COOKIE, hostCookieOptions, secretMatches } from '@/lib/host';

export const config = { matcher: ['/bench', '/cross'] };

/** `/bench?key=<secret>` sets the host cookie and drops the key from the URL. */
export function middleware(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key');
  if (key === null) return NextResponse.next();
  const clean = req.nextUrl.clone();
  clean.searchParams.delete('key');
  if (!secretMatches(key)) clean.searchParams.set('denied', '1');
  const res = NextResponse.redirect(clean);
  if (secretMatches(key)) res.cookies.set(HOST_COOKIE, key, hostCookieOptions());
  return res;
}
