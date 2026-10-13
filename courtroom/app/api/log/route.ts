import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { LogLine } from '@trial/shared';
import { handle, intParam, jsonError } from '@/lib/http';
import { isHost } from '@/lib/host';
import { RoundId } from '@/lib/keys';
import { appendLog, readLog, resolveRound } from '@/lib/store';

export const dynamic = 'force-dynamic';

const LogPost = z.object({ round: RoundId, lines: z.array(LogLine).max(500) });

export async function GET(req: NextRequest) {
  return handle(async () => {
    const round = await resolveRound(req);
    const after = intParam(req, 'after', 0);
    return NextResponse.json(await readLog(round, after));
  });
}

export async function POST(req: NextRequest) {
  if (!isHost(req)) return jsonError('host only', 401);
  return handle(async () => {
    const { round, lines } = LogPost.parse(await req.json());
    const length = await appendLog(round, lines);
    return NextResponse.json({ ok: true, length });
  });
}
