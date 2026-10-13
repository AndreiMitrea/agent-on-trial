import Anthropic from '@anthropic-ai/sdk';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import type { Evidence, Exhibit, LogLine } from '@trial/shared';
import { agentSummary, type AgentSummary } from '@/lib/chain';
import { anthropicModel, gatewayUrl } from '@/lib/env';
import { handle, jsonError } from '@/lib/http';
import { isHost } from '@/lib/host';
import { K, RoundId } from '@/lib/keys';
import { requireRedis } from '@/lib/redis';
import { getEvidence, readLogTail } from '@/lib/store';
import { fetchUriText } from '@/lib/uri';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const Role = z.enum(['defendant', 'prosecutor', 'defense']);
type Role = z.infer<typeof Role>;
const AskPost = z.object({ round: RoundId, question: z.string().max(2000).optional(), role: Role });

const RULES = `You take part in a live stage trial of an AI agent. The agent minted an ERC-8004 identity on Celo, earned USD₮ on askbots.ai, paid for a service through x402, bought something from a shady provider, opened a dispute, and received reputation feedback on chain. The audience will vote whether to trust it.

Rules:
- Every factual claim ends with the id of an exhibit that supports it, in square brackets, like [B2]. Use only ids that appear in the evidence below.
- Make no claim that no exhibit supports. If the evidence does not cover something, say so.
- Do not invent transactions, amounts, addresses, dates or outcomes.
- Plain language. Short declarative sentences. No filler, no marketing words, no exclamation marks.`;

const ROLE_PROMPT: Record<Role, string> = {
  defendant:
    'You are the defendant: the agent on trial. Answer in the first person as that agent. Say what you did and why, using the log and the exhibits. Keep answers under 150 words unless asked for detail.',
  prosecutor:
    'You are the prosecutor. Write a closing statement of about 120 words that argues the audience should not trust this agent. Build it on the exhibits.',
  defense:
    'You are the defense. Write a closing statement of about 120 words that argues the audience should trust this agent. Build it on the exhibits.',
};

const DEFAULT_QUESTION: Record<Role, string> = {
  defendant: 'Tell the court what you did in this run.',
  prosecutor: 'Write your closing statement.',
  defense: 'Write your closing statement.',
};

function isMemoryExhibit(e: Exhibit): boolean {
  return e.kind === 'ref' && (e.act === 'earn' || e.act === 'spend' || e.act === 'dispute') && Boolean(e.uri);
}

async function memoryFiles(evidence: Evidence): Promise<string> {
  const gateway = gatewayUrl();
  const parts = await Promise.all(
    evidence.exhibits.filter(isMemoryExhibit).map(async (e) => {
      try {
        const text = await fetchUriText(e.uri as string, gateway, 16_000);
        return `<file exhibit="${e.id}" title="${e.title}">\n${text}\n</file>`;
      } catch (err) {
        return `<file exhibit="${e.id}" title="${e.title}" error="${err instanceof Error ? err.message : 'fetch failed'}" />`;
      }
    }),
  );
  return parts.join('\n');
}

function formatLog(lines: LogLine[]): string {
  return lines.map((l) => `${l.at} ${l.kind}: ${l.text}`).join('\n');
}

function buildUserMessage(p: {
  evidence: Evidence;
  chain: AgentSummary | null;
  memory: string;
  log: LogLine[];
  question: string;
}): string {
  return [
    '<evidence>',
    JSON.stringify(p.evidence, null, 1),
    '</evidence>',
    '<chain_summary>',
    p.chain ? JSON.stringify(p.chain, null, 1) : 'No agentId in evidence yet, so no chain summary.',
    '</chain_summary>',
    '<memory_files>',
    p.memory || 'None.',
    '</memory_files>',
    '<live_log last="200">',
    formatLog(p.log) || 'Empty.',
    '</live_log>',
    '',
    `Question: ${p.question}`,
  ].join('\n');
}

export async function POST(req: NextRequest) {
  if (!isHost(req)) return jsonError('host only', 401);
  if (!process.env.ANTHROPIC_API_KEY) return jsonError('ANTHROPIC_API_KEY not configured', 500);

  return handle(async () => {
    const { round, role, question } = AskPost.parse(await req.json());
    const redis = requireRedis();
    const evidence = await getEvidence(round);
    if (!evidence) return jsonError(`no evidence for round ${round}`, 404);

    const [log, chain, memory] = await Promise.all([
      readLogTail(round, 200),
      evidence.agentId ? agentSummary(evidence.agentId).catch(() => null) : Promise.resolve(null),
      memoryFiles(evidence),
    ]);

    const client = new Anthropic();
    const stream = client.messages.stream({
      model: anthropicModel(),
      max_tokens: 2048,
      system: `${RULES}\n\n${ROLE_PROMPT[role]}`,
      messages: [
        {
          role: 'user',
          content: buildUserMessage({ evidence, chain, memory, log, question: question || DEFAULT_QUESTION[role] }),
        },
      ],
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium' },
    });

    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        let full = '';
        try {
          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              full += event.delta.text;
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
          const final = await stream.finalMessage();
          if (final.stop_reason === 'refusal') controller.enqueue(encoder.encode('\n[The model declined to answer.]'));
          if (final.stop_reason === 'max_tokens') controller.enqueue(encoder.encode('\n[Cut off at the token limit.]'));
          if (role !== 'defendant' && full.trim()) await redis.hset(K.statements(round), { [role]: full.trim() });
        } catch (e) {
          controller.enqueue(encoder.encode(`\n[error: ${e instanceof Error ? e.message : 'stream failed'}]`));
        } finally {
          controller.close();
        }
      },
      cancel() {
        stream.abort();
      },
    });

    return new Response(body, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Role': role },
    });
  });
}
