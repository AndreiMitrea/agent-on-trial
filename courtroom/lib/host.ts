import type { NextRequest } from 'next/server';

export const HOST_COOKIE = 'host';
export const HOST_HEADER = 'x-host-secret';

/** Constant-time string compare that also works in the edge runtime (middleware). */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function secretMatches(candidate: string | null | undefined): boolean {
  const secret = process.env.HOST_SECRET;
  if (!secret || !candidate) return false;
  return safeEqual(candidate, secret);
}

/** True for the terminal (header) and for the host browser (cookie). */
export function isHost(req: NextRequest): boolean {
  return secretMatches(req.headers.get(HOST_HEADER)) || secretMatches(req.cookies.get(HOST_COOKIE)?.value);
}

export function hostCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  };
}
