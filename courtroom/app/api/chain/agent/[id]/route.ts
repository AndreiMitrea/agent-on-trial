import { NextResponse } from 'next/server';
import { agentSummary } from '@/lib/chain';
import { handle, jsonError } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^\d{1,20}$/.test(id)) return jsonError('agent id must be a positive integer', 400);
  return handle(async () => NextResponse.json(await agentSummary(id)));
}
