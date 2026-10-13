import { TAGS, canonicalJson, pctTrust, type VoteTally } from '@trial/shared';
import type { ActContext } from '../agent/context.js';
import { getStorage } from '../adapters/storage/index.js';
import { env } from '../lib/env.js';
import { replayFixture } from '../lib/evidence.js';
import { readReputation, writeFeedback } from '../lib/feedback.js';
import { log } from '../lib/log.js';
import { publish } from '../lib/publish.js';
import { asScript, isMain } from './run.js';

const EVENT = process.env.TRIAL_EVENT ?? 'devcon';

/**
 * Act 5: the verdict.
 * The audience tally is stored, then written on chain by the jury key as
 * ERC-8004 feedback: value = percent who trust, tag jury/<event>.
 */
export async function verdictAct(ctx: ActContext) {
  if (env.fixture) return replayFixture(ctx.evidence, 'verdict');
  const agentId = ctx.evidence.data.agentId ?? env.agentId;
  if (!agentId) throw new Error('no agent id; run act identity first');

  const tally = (await publish.tally(env.round)) ?? tallyFromArgs();
  if (!tally) throw new Error('no tally: set COURTROOM_URL, or pass --trust N --distrust M');
  if (tally.open) {
    await publish.round(env.round, 'close');
    tally.open = false;
    tally.closedAt = new Date().toISOString();
  }
  const pct = pctTrust(tally);
  log.host(`verdict: ${tally.trust} trust, ${tally.distrust} don't trust (${tally.voters} voters) → ${pct}% trust`);

  const stored = await getStorage().put(canonicalJson({ type: 'agent-on-trial/verdict-v1', agentId, event: EVENT, ...tally, pctTrust: pct }), { name: 'verdict.json' });
  ctx.evidence.add({ letter: 'V', act: 'verdict', kind: 'ref', title: `Audience tally stored: ${pct}% trust`, uri: stored.uri, hash: stored.hash, gatewayUrl: stored.gatewayUrl, detail: { ...tally } });

  const fb = await writeFeedback({
    role: 'jury',
    agentId,
    value: pct,
    tag1: TAGS.jury,
    tag2: EVENT,
    endpoint: env.courtroomUrl || 'https://github.com/GigaHierz/agent-on-trial',
    evidence: { trust: tally.trust, distrust: tally.distrust, voters: tally.voters, tally: { uri: stored.uri, hash: stored.hash } },
  });
  if (fb) {
    ctx.evidence.add({ letter: 'V', act: 'verdict', kind: 'tx', title: `Verdict written on chain by the jury: ${pct}% trust`, txHash: fb.txHash, uri: fb.ref.uri, hash: fb.ref.hash, gatewayUrl: fb.ref.gatewayUrl, detail: { value: pct, tag1: TAGS.jury, tag2: EVENT } });
    const { summaries } = await readReputation(agentId, [TAGS.jury]);
    const jury = summaries.find((s) => s.tag1 === TAGS.jury);
    log.host(`read back from chain: jury ${jury ? `${jury.count}× avg ${jury.value}` : 'not visible yet'}`);
  }
}

function tallyFromArgs(): VoteTally | null {
  const get = (name: string) => {
    const i = process.argv.indexOf(name);
    return i >= 0 ? Number(process.argv[i + 1]) : NaN;
  };
  const trust = get('--trust');
  const distrust = get('--distrust');
  if (Number.isNaN(trust) || Number.isNaN(distrust)) return null;
  return { round: env.round, trust, distrust, voters: trust + distrust, open: false, closedAt: new Date().toISOString() };
}

if (isMain(import.meta.url)) asScript('verdict', verdictAct);
