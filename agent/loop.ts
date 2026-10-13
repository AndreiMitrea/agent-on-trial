import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import type { BetaRunnableTool } from '@anthropic-ai/sdk/lib/tools/BetaRunnableTool';
import { env } from '../lib/env.js';
import { log } from '../lib/log.js';
import { ACTS, type ActName } from './acts.js';
import type { ActContext } from './context.js';
import { AskbotsClient } from '../lib/askbots.js';
import { askbotsTools } from './tools/askbots.js';
import { buyTools } from './tools/buy-mcp.js';
import { disputeTools } from './tools/dispute.js';
import { memoryTools } from './tools/memory.js';
import { reputationTools } from './tools/reputation.js';

const here = dirname(fileURLToPath(import.meta.url));
export const SYSTEM = readFileSync(join(here, 'system.md'), 'utf8');

const MAX_ITERATIONS = 12;

let anthropic: Anthropic | null = null;
export function claude(): Anthropic {
  return (anthropic ??= new Anthropic());
}

export type AnyTool = BetaRunnableTool<any>;

/**
 * Every tool the defendant can ever use, built once per context. Acts pick a
 * subset by name; the free-text session gets the union.
 */
export async function allTools(ctx: ActContext, askbots: AskbotsClient | null, act?: ActName): Promise<AnyTool[]> {
  const tools: AnyTool[] = [...memoryTools(ctx, act), ...reputationTools(), ...disputeTools(ctx)];
  if (askbots) tools.push(...askbotsTools(ctx, askbots));
  try {
    tools.push(...(await buyTools(ctx)));
  } catch (err) {
    log.warn(`buy MCP unavailable: ${(err as Error).message.split('\n')[0]}`);
  }
  return tools;
}

export interface TurnOptions {
  ctx: ActContext;
  tools: AnyTool[];
  /** Conversation so far; the turn appends to it. */
  messages: Anthropic.Beta.BetaMessageParam[];
  userText: string;
}

/**
 * One agent turn: the model runs tools until it stops. Each assistant message
 * is printed as it lands, so the audience sees the agent think out loud.
 */
export async function runTurn(o: TurnOptions): Promise<string> {
  o.messages.push({ role: 'user', content: o.userText });
  const runner = claude().beta.messages.toolRunner({
    model: env.anthropicModel,
    max_tokens: 8000,
    system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
    tools: o.tools,
    messages: o.messages,
    max_iterations: MAX_ITERATIONS,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'medium' },
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
  });

  let lastText = '';
  for await (const message of runner) {
    for (const block of message.content) {
      if (block.type === 'text' && block.text.trim()) {
        lastText = block.text.trim();
        for (const line of lastText.split('\n')) if (line.trim()) log.agent(line.trim());
      }
    }
    if (message.stop_reason === 'refusal') {
      log.warn('the model declined to continue this turn');
      break;
    }
    if (message.stop_reason === 'max_tokens') {
      log.warn('the model hit max_tokens; stopping this turn');
      break;
    }
  }
  const final = await runner.done();
  // Keep the whole exchange so the next host message continues the conversation.
  const params = runner.params;
  o.messages.length = 0;
  o.messages.push(...params.messages);
  if (final && !params.messages.some((m) => m.role === 'assistant' && m.content === final.content)) {
    o.messages.push({ role: 'assistant', content: final.content });
  }
  return lastText;
}

/** Run one scripted act with its tool allowlist. */
export async function runAct(ctx: ActContext, act: ActName, askbots: AskbotsClient | null, messages: Anthropic.Beta.BetaMessageParam[] = []): Promise<string> {
  const spec = ACTS[act];
  const tools = (await allTools(ctx, askbots, act)).filter((t) => spec.tools.includes(t.name));
  const missing = spec.tools.filter((n) => !tools.some((t) => t.name === n));
  if (missing.length) log.warn(`act ${act} is missing tools: ${missing.join(', ')}`);
  log.host(`act ${act}: ${spec.task(ctx.params).split('\n')[0]}`);
  return runTurn({ ctx, tools, messages, userText: spec.task(ctx.params) });
}
