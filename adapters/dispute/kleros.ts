import { canonicalJson } from '@trial/shared';
import type { StorageAdapter } from '../storage/types.js';
import type { DisputeAdapter, DisputeEvidence, DisputeStatus, Ruling } from './types.js';

/**
 * Kleros dispute adapter. Stub with the shape filled in and the chain calls
 * left open for the Kleros team.
 *
 * Kleros Court v2 lives on Arbitrum, not Celo. That is fine: this adapter
 * never signs on Celo. It opens the dispute on Arbitrum (or wherever the
 * arbitrable contract is), stores the evidence URI, and reports the ruling.
 * The step script then writes the ruling to the Celo Reputation Registry from
 * our arbitrator key, quoting `proofUrl`.
 *
 * Env: KLEROS_RPC_URL, KLEROS_PRIVATE_KEY, KLEROS_ARBITRABLE_ADDRESS.
 *
 * TODO(Kleros):
 *  - open(): pin `evidence` (the Swarm uri is already content-addressed, so it
 *    can be the evidence URI as is), call createDispute / the Escrow v2 flow
 *    on the arbitrable contract, return { disputeId, uri, url: court URL }.
 *  - status(): read the dispute period and map to open | evidence | ruled | closed.
 *  - ruling(): once executed, read ruling(disputeId): 1 -> complainant,
 *    2 -> respondent, 0 -> refused. Fill proofUrl with the Arbiscan tx.
 *
 * Verify: DISPUTE=kleros pnpm check:dispute
 */
export class KlerosDispute implements DisputeAdapter {
  readonly name = 'kleros' as const;
  private readonly pending = new Map<string, { uri: string; openedAt: string }>();

  constructor(
    private readonly storage: StorageAdapter,
    private readonly env: NodeJS.ProcessEnv = process.env,
  ) {}

  async open(evidence: DisputeEvidence) {
    const file = { type: 'agent-on-trial/dispute-v1', openedAt: new Date().toISOString(), ...evidence };
    const stored = await this.storage.put(canonicalJson(file), { name: 'dispute.json' });
    // TODO(Kleros): replace with the on-chain dispute id.
    const disputeId = `kleros-pending-${stored.hash.slice(2, 14)}`;
    this.pending.set(disputeId, { uri: stored.uri, openedAt: file.openedAt });
    return { disputeId, uri: stored.uri, url: stored.gatewayUrl };
  }

  async status(disputeId: string): Promise<DisputeStatus> {
    return this.pending.has(disputeId) ? 'open' : 'closed';
  }

  async ruling(_disputeId: string): Promise<Ruling | null> {
    // TODO(Kleros): read the executed ruling.
    return null;
  }

  async health() {
    const missing = ['KLEROS_RPC_URL', 'KLEROS_PRIVATE_KEY', 'KLEROS_ARBITRABLE_ADDRESS'].filter((k) => !this.env[k]);
    return missing.length
      ? { ok: false, detail: `missing ${missing.join(', ')}; adapter is a stub until Kleros fills it in` }
      : { ok: true, detail: 'env present; chain calls still TODO' };
  }
}
