import { NextResponse, type NextRequest } from 'next/server';
import { handle } from '@/lib/http';
import { getTally, resolveRound } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return handle(async () => NextResponse.json(await getTally(await resolveRound(req))));
}
