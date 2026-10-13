import { ASKBOTS_TAGS } from '@trial/shared';
import { env } from '../lib/env.js';
import { readReputation } from '../lib/feedback.js';
import { flushLog, log } from '../lib/log.js';

/**
 * pnpm askbots:cron
 *
 * askbots writes its own ERC-8004 feedback (paid-acceptance-rate,
 * builder-rating) on a weekly cron with a 10-sample floor. Trigger it by hand
 * before the show so the defendant's askbots tags are on chain. Needs the
 * operator's ASKBOTS_CRON_SECRET.
 */
async function main() {
  if (!env.askbotsCronSecret) throw new Error('ASKBOTS_CRON_SECRET unset (operator access to askbots.ai)');
  const url = `${env.askbotsUrl}/api/cron/erc8004-feedback`;
  log.host(`triggering ${url}`);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${env.askbotsCronSecret}` } });
  const text = await res.text();
  log.info(`${res.status} ${text.slice(0, 600)}`);
  if (!res.ok) throw new Error(`cron returned ${res.status}`);
  const agentId = env.agentId;
  if (agentId) {
    const { summaries } = await readReputation(agentId, [ASKBOTS_TAGS.tag1]);
    const s = summaries.find((x) => x.tag1 === ASKBOTS_TAGS.tag1);
    log.host(`agent ${agentId} askbots tags on chain: ${s ? `${s.count} entr${s.count === 1 ? 'y' : 'ies'}, avg ${s.value}` : 'none (needs 10 judged reviews and 10 builder ratings)'}`);
  }
  await flushLog();
}

main().catch(async (err) => {
  log.error(String(err));
  await flushLog();
  process.exit(1);
});
