import { ASKBOTS_ESCROW, ASKBOTS_URL, CHAIN_ID, DEMO_TOKEN, TAGS, celoscanToken } from '@trial/shared';
import { lastArtifact, type ActContext } from '../agent/context.js';
import { runAct } from '../agent/loop.js';
import { AskbotsClient, loadCreds, projectIdOf } from '../lib/askbots.js';
import { env } from '../lib/env.js';
import { replayFixture } from '../lib/evidence.js';
import { writeFeedback } from '../lib/feedback.js';
import { log } from '../lib/log.js';
import { asScript, isMain } from './run.js';

/**
 * Act 2: find work and get paid.
 * The agent reviews an open askbots project, passes the challenge, and the
 * payout lands on chain. The witness then writes ERC-8004 feedback with the
 * payout tx as proof and the memory file as evidence.
 */
export async function earnAct(ctx: ActContext, askbots: AskbotsClient | null = null) {
  if (env.fixture) return replayFixture(ctx.evidence, 'earn');
  const agentId = ctx.evidence.data.agentId ?? env.agentId;
  if (!agentId) throw new Error('no agent id; run act identity first');
  if (!askbots) {
    const creds = await loadCreds();
    if (!creds) throw new Error('no askbots credentials; run act identity first');
    askbots = new AskbotsClient(env.askbotsUrl, creds.apiKey);
  }

  const open = await askbots.listProjects();
  if (open.length === 0) {
    log.warn('askbots has no open project for this agent. Fund one from the counterparty account:');
    log.warn('  pnpm exec askbots submit --file evidence/submission.json --execute');
    ctx.evidence.add({ letter: 'B', act: 'earn', kind: 'note', title: 'No open askbots project; nothing earned', detail: { hint: 'askbots submit --file evidence/submission.json --execute' } });
    return;
  }
  ctx.params.propertyUrl = open[0].propertyUrl;
  log.host(`${open.length} open project(s); first: "${open[0].name}" ${open[0].propertyUrl} (${projectIdOf(open[0])})`);

  await runAct(ctx, 'earn', askbots);

  const payout = lastArtifact(ctx, 'askbots_payout');
  const memory = lastArtifact(ctx, 'memory');
  if (memory) {
    ctx.evidence.add({ letter: 'C', act: 'earn', kind: 'ref', title: `Memory after earning (${memory.entries} entries)`, uri: memory.uri, hash: memory.hash, gatewayUrl: memory.gatewayUrl });
  }
  if (!payout) {
    const review = lastArtifact(ctx, 'askbots_review');
    log.warn(`no payout this time: ${review?.outcome ?? 'no review submitted'} ${review?.detail ?? ''}`);
    ctx.evidence.add({ letter: 'B', act: 'earn', kind: 'note', title: `Review ${review?.outcome ?? 'not submitted'}`, detail: review ? { ...review } : undefined });
    return;
  }

  ctx.evidence.add({
    letter: 'B',
    act: 'earn',
    kind: 'tx',
    title: `Paid ${payout.payout} USD₮ by askbots.ai for reviewing "${payout.projectName}"`,
    txHash: payout.txHash,
    url: celoscanToken(ctx.evidence.data.agentAddress ?? ''),
    detail: { projectId: payout.projectId, from: ASKBOTS_ESCROW, token: DEMO_TOKEN.address },
  });

  const fb = await writeFeedback({
    role: 'witness',
    agentId,
    value: 100,
    tag1: TAGS.earned,
    tag2: 'askbots-review',
    endpoint: ASKBOTS_URL,
    proofOfPayment: { fromAddress: ASKBOTS_ESCROW, toAddress: ctx.evidence.data.agentAddress ?? '', chainId: String(CHAIN_ID), txHash: payout.txHash },
    evidence: { project: payout.projectName, projectId: payout.projectId, memory: memory ? { uri: memory.uri, hash: memory.hash } : null },
  });
  if (fb) {
    ctx.evidence.add({
      letter: 'A',
      act: 'earn',
      kind: 'tx',
      title: `Feedback "earned" written by the witness, evidence hashed on chain`,
      txHash: fb.txHash,
      uri: fb.ref.uri,
      hash: fb.ref.hash,
      gatewayUrl: fb.ref.gatewayUrl,
      detail: { tag1: TAGS.earned, tag2: 'askbots-review', value: 100, client: fb.clientAddress },
    });
  }
}

if (isMain(import.meta.url)) asScript('earn', (ctx) => earnAct(ctx));
