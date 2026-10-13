import { CAIP2, DEMO_TOKEN, canonicalJson } from '@trial/shared';
import { z } from 'zod';
import { getDispute } from '../adapters/dispute/index.js';
import { getStorage } from '../adapters/storage/index.js';

/**
 * pnpm check:dispute [--wait <ms>]      (DISPUTE=local|kleros)
 *
 * Opens a dispute from a fixture receipt and prints the ruling, or "pending"
 * with the external id. Shape is checked with zod so a partner adapter that
 * returns the wrong thing fails here, not on stage.
 */
const OpenResult = z.object({ disputeId: z.string().min(1), uri: z.string().min(1), url: z.string().optional() });
const RulingShape = z.object({
  winner: z.enum(['complainant', 'respondent', 'refused']),
  rationale: z.string().min(1),
  ruledAt: z.string(),
  ref: z.object({ uri: z.string(), hash: z.string() }).partial().optional(),
  externalId: z.string().optional(),
  proofUrl: z.string().optional(),
});

async function main() {
  const waitArg = process.argv.indexOf('--wait');
  const waitMs = waitArg >= 0 ? Number(process.argv[waitArg + 1]) : 10_000;
  const storage = getStorage();
  const dispute = getDispute();
  console.log(`adapter       ${dispute.name} (storage ${storage.name})`);
  const health = await dispute.health();
  console.log(`health        ${health.ok ? 'ok' : 'warn'} ${health.detail ?? ''}`);

  const delivered = await storage.put('{"report":"Celo market outlook: strong fundamentals. Confidence: high."}', { contentType: 'application/json', name: 'delivered.json' });
  const receiptRef = await storage.put(canonicalJson({ url: 'http://localhost:4402/report/celo', amount: '0.01', asset: DEMO_TOKEN.symbol, txHash: '0x' + 'ab'.repeat(32) }), { name: 'receipt.json' });

  const opened = OpenResult.parse(
    await dispute.open({
      complainant: { address: '0x0000000000000000000000000000000000000001', agentId: '1' },
      respondent: { address: '0x0000000000000000000000000000000000000002', agentId: '2', endpoint: 'http://localhost:4402/report/celo' },
      receipt: { txHash: ('0x' + 'ab'.repeat(32)) as `0x${string}`, amount: '0.01', asset: DEMO_TOKEN.address, network: CAIP2, receiptRef },
      expected: 'a Celo market report with sections: price, volume, sources',
      delivered,
      claim: 'I paid 0.01 USD₮ for a report with price, volume and sources. The body has none of them.',
    }),
  );
  console.log(`open          ${opened.disputeId} · evidence ${opened.uri.slice(0, 48)}…${opened.url ? ` · ${opened.url}` : ''}`);
  console.log(`status        ${await dispute.status(opened.disputeId)}`);

  const ruling = await dispute.ruling(opened.disputeId, { waitMs });
  if (!ruling) {
    console.log(`ruling        pending${health.detail ? ` (${health.detail})` : ''}`);
    return;
  }
  const r = RulingShape.parse(ruling);
  console.log(`ruling        ${r.winner} — ${r.rationale}`);
  if (r.ref?.uri) console.log(`ruling file   ${r.ref.uri.slice(0, 48)}…`);
  if (r.proofUrl) console.log(`proof         ${r.proofUrl}`);
  if (r.winner !== 'complainant') {
    console.error('expected the complainant to win: the delivered body has none of the required sections');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(String(err));
  process.exit(1);
});
