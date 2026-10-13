import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { RedisMissing } from './redis';

export function jsonError(error: string, status: number): NextResponse {
  return NextResponse.json({ error }, { status });
}

function isZodError(e: unknown): e is ZodError {
  // Two copies of zod can exist in a workspace, so check the name too.
  return e instanceof ZodError || (e instanceof Error && e.name === 'ZodError');
}

/** Runs a route body and maps the known failures to JSON errors. */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof RedisMissing) return jsonError('redis not configured', 500);
    if (isZodError(e)) {
      const detail = e.issues.map((i) => `${i.path.map(String).join('.') || 'body'}: ${i.message}`).join('; ');
      return jsonError(`invalid input: ${detail}`, 400);
    }
    if (e instanceof SyntaxError) return jsonError('invalid json', 400);
    return jsonError(e instanceof Error ? e.message : 'unknown error', 500);
  }
}

export function intParam(req: Request, name: string, fallback: number): number {
  const raw = new URL(req.url).searchParams.get(name);
  if (raw === null) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}
