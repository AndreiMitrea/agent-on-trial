import { celoscanTx } from '@trial/shared';
import { getStorage } from '../adapters/storage/index.js';
import { env } from '../lib/env.js';
import type { EvidenceStore } from '../lib/evidence.js';
import { readReputation } from '../lib/feedback.js';
import { log } from '../lib/log.js';
import { claude } from './loop.js';
import type { Memory } from './tools/memory.js';

export type Role = 'defendant' | 'prosecutor' | 'defense';

const ROLE_PROMPT: Record<Role, string> = {
  defendant: 'You are the agent on trial. Answer the question in the first person, in at most six short sentences.',
  prosecutor: 'You are the prosecutor. Write a closing statement of at most 120 words arguing the agent should not be trusted.',
  defense: 'You are the defense. Write a closing statement of at most 120 words arguing the agent can be trusted.',
};

/**
 * Cross-examination from the terminal: the model answers only from the
 * evidence and the agent's stored memory, and every claim cites an exhibit id.
 * Nothing here touches the chain.
 */
export async function crossExamine(p: { role: Role; question?: string; evidence: EvidenceStore; memory: Memory }): Promise<string> {
  const ev = p.evidence.data;
  const ids = ev.exhibits.map((e) => e.id);
  let memoryText = '';
  if (p.memory.head) {
    try {
      memoryText = new TextDecoder().decode(await getStorage().get(p.memory.head.uri));
    } catch {
      memoryText = JSON.stringify(p.memory.entries);
    }
  }
  let reputation = '';
  if (ev.agentId) {
    try {
      const r = await readReputation(ev.agentId, ['earned', 'paid', 'dispute', 'ruling', 'jury', 'askbots']);
      reputation = JSON.stringify(r.summaries);
    } catch {
      /* chain read failed; the exhibits still stand */
    }
  }
  const system = [
    ROLE_PROMPT[p.role],
    'Rules: every factual claim ends with the exhibit id it rests on, in square brackets, like [B2]. Only these ids exist: ' + (ids.join(', ') || 'none') + '.',
    'If the evidence does not support a claim, say so instead of guessing. Plain language, no filler, no exclamation marks.',
    `Explorer link format: ${celoscanTx('<txHash>')}`,
  ].join('\n');
  const context = [
    `EVIDENCE (run ${ev.runId}, agent ${ev.agentId ?? 'unregistered'}):`,
    JSON.stringify(ev.exhibits.map(({ id, act, kind, title, txHash, uri, hash, url, detail, fixture }) => ({ id, act, kind, title, txHash, uri: uri?.slice(0, 60), hash, url, detail, fixture }))),
    `REPUTATION SUMMARY: ${reputation || 'none read'}`,
    `MEMORY: ${memoryText.slice(0, 6000) || 'empty'}`,
  ].join('\n\n');
  const question = p.question ?? (p.role === 'prosecutor' ? 'Deliver the closing statement.' : p.role === 'defense' ? 'Deliver the closing statement.' : 'Who are you and why should we trust you?');

  const stream = claude().messages.stream({
    model: env.anthropicModel,
    max_tokens: 1500,
    system,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'medium' },
    messages: [{ role: 'user', content: `${context}\n\nQUESTION: ${question}` }],
  });
  let text = '';
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      text += event.delta.text;
      process.stdout.write(event.delta.text);
    }
  }
  process.stdout.write('\n');
  const final = await stream.finalMessage();
  if (final.stop_reason === 'refusal') log.warn('the model declined this question');
  log.agent(`[${p.role}] ${text.replace(/\s+/g, ' ').slice(0, 400)}`);
  return text;
}
