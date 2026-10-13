import { NextResponse, type NextRequest } from 'next/server';
import { Evidence } from '@trial/shared';
import { handle, jsonError } from '@/lib/http';
import { isHost } from '@/lib/host';
import { getEvidence, resolveRound, setEvidence } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return handle(async () => {
    const round = await resolveRound(req);
    return NextResponse.json(await getEvidence(round));
  });
}

export async function POST(req: NextRequest) {
  if (!isHost(req)) return jsonError('host only', 401);
  return handle(async () => {
    const evidence = Evidence.parse(await req.json());
    await setEvidence(evidence);
    return NextResponse.json({ ok: true, round: evidence.round, exhibits: evidence.exhibits.length });
  });
}
