import { NextResponse } from 'next/server';
import { handle } from '@/lib/http';
import { currentRound } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  return handle(async () => NextResponse.json({ round: await currentRound() }));
}
