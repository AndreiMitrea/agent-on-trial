import { NextResponse, type NextRequest } from 'next/server';
import { HOST_COOKIE, hostCookieOptions, secretMatches } from '@/lib/host';

export const dynamic = 'force-dynamic';

function safePath(to: unknown): string {
  return typeof to === 'string' && to.startsWith('/') && !to.startsWith('//') ? to : '/bench';
}

/** Form target for the host login. Sets the host cookie and redirects back. */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const key = form.get('key');
  const to = safePath(form.get('to'));
  const target = new URL(to, req.url);

  if (typeof key !== 'string' || !secretMatches(key)) {
    target.searchParams.set('denied', '1');
    return NextResponse.redirect(target, 303);
  }
  const res = NextResponse.redirect(target, 303);
  res.cookies.set(HOST_COOKIE, key, hostCookieOptions());
  return res;
}
