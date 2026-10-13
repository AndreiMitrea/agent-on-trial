import { NextResponse } from 'next/server';
import { AGENT_DESCRIPTION, AGENT_NAME } from '@/lib/agent';
import { baseUrl } from '@/lib/env';

export const dynamic = 'force-dynamic';

/** Minimal A2A agent card. */
export async function GET(req: Request) {
  const base = baseUrl(req);
  return NextResponse.json(
    {
      name: AGENT_NAME,
      description: AGENT_DESCRIPTION,
      url: base,
      version: '0.1.0',
      capabilities: { streaming: false },
      skills: [
        {
          id: 'review',
          name: 'Property review',
          description: 'Reviews a web property and answers builder questions for USD₮ on askbots.ai',
        },
      ],
      defaultInputModes: ['text'],
      defaultOutputModes: ['text'],
    },
    { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } },
  );
}
