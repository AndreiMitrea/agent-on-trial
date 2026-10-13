import { NextResponse } from 'next/server';
import { buildRegistrationFile } from '@trial/shared';
import { AGENT_DESCRIPTION, AGENT_NAME } from '@/lib/agent';
import { baseUrl } from '@/lib/env';
import { getRedis } from '@/lib/redis';
import { getAgentId } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const base = baseUrl(req);
  let agentId: string | null = null;
  if (getRedis()) agentId = await getAgentId().catch(() => null);
  if (!agentId && process.env.AGENT_ID) agentId = process.env.AGENT_ID;

  const file = buildRegistrationFile({
    name: AGENT_NAME,
    description: AGENT_DESCRIPTION,
    services: [
      { name: 'A2A', endpoint: `${base}/.well-known/agent-card.json` },
      { name: 'web', endpoint: base },
    ],
    agentId,
  });
  return NextResponse.json(file, {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
