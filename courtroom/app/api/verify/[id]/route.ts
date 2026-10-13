import { NextResponse, type NextRequest } from 'next/server';
import { keccak256 } from 'viem';
import { txSucceeded } from '@/lib/chain';
import { gatewayUrl } from '@/lib/env';
import { handle, jsonError } from '@/lib/http';
import { getEvidence, resolveRound } from '@/lib/store';
import { fetchUriBytes } from '@/lib/uri';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return handle(async () => {
    const round = await resolveRound(req);
    const evidence = await getEvidence(round);
    const exhibit = evidence?.exhibits.find((e) => e.id === id);
    if (!exhibit) return jsonError(`no exhibit ${id} in round ${round}`, 404);

    if (exhibit.uri && exhibit.hash) {
      const bytes = await fetchUriBytes(exhibit.uri, gatewayUrl());
      const computedHash = keccak256(bytes);
      const expectedHash = exhibit.hash.toLowerCase();
      return NextResponse.json({ ok: computedHash === expectedHash, computedHash, expectedHash, bytes: bytes.length });
    }
    if (exhibit.txHash) {
      if (!/^0x[0-9a-fA-F]{64}$/.test(exhibit.txHash)) return jsonError('malformed txHash', 400);
      return NextResponse.json(await txSucceeded(exhibit.txHash as `0x${string}`));
    }
    return NextResponse.json({ ok: true, note: 'nothing to verify' });
  });
}
