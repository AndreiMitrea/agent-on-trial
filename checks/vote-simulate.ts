import { env } from '../lib/env.js';

/**
 * pnpm vote:simulate [--n 200] [--round <id>]
 *
 * Posts N votes to the courtroom from fresh voter cookies, roughly 70/30
 * trust, so a rehearsal has a tally to write on chain.
 */
async function main() {
  if (!env.courtroomUrl) throw new Error('COURTROOM_URL unset');
  const nArg = process.argv.indexOf('--n');
  const n = nArg >= 0 ? Number(process.argv[nArg + 1]) : 200;
  await fetch(`${env.courtroomUrl}/api/vote/round`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-host-secret': env.hostSecret },
    body: JSON.stringify({ round: env.round, action: 'open' }),
  });
  let ok = 0;
  for (let i = 0; i < n; i++) {
    const choice = Math.random() < 0.7 ? 'trust' : 'distrust';
    const res = await fetch(`${env.courtroomUrl}/api/vote`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: `voter=sim-${Date.now()}-${i}` },
      body: JSON.stringify({ round: env.round, choice }),
    });
    if (res.ok) ok++;
  }
  const tally = await (await fetch(`${env.courtroomUrl}/api/vote/tally?round=${env.round}`)).json();
  console.log(`${ok}/${n} votes accepted · tally ${JSON.stringify(tally)}`);
}

main().catch((err) => {
  console.error(String(err));
  process.exit(1);
});
