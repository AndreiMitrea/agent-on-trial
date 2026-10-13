import type { Address, Hex } from 'viem';
import type { StoredRef } from '../storage/types.js';

export interface DisputeEvidence {
  complainant: { address: Address; agentId: string };
  respondent: { address: Address; agentId?: string; endpoint: string };
  receipt: {
    txHash: Hex;
    amount: string;
    asset: Address;
    network: 'eip155:42220';
    receiptRef: StoredRef;
  };
  /** The spec the buyer paid for, in words. */
  expected: string;
  /** What came back, stored verbatim. */
  delivered: StoredRef;
  /** The complainant's memory head at the time, if any. */
  memory?: StoredRef;
  /** One paragraph from the complainant. */
  claim: string;
}

export type DisputeStatus = 'open' | 'evidence' | 'ruled' | 'closed';

export interface Ruling {
  winner: 'complainant' | 'respondent' | 'refused';
  rationale: string;
  ruledAt: string;
  /** The ruling document, stored. */
  ref?: StoredRef;
  /** e.g. a Kleros disputeID */
  externalId?: string;
  /** e.g. an Arbiscan tx or a Kleros court URL */
  proofUrl?: string;
}

/**
 * The dispute plug-in. Kleros implements this in one file:
 * adapters/dispute/kleros.ts. `pnpm check:dispute` proves it works.
 *
 * Rules:
 * - Adapters never sign Celo transactions. The step scripts write the ERC-8004
 *   feedback (dispute, ruling) from what the adapter returns.
 * - open() must store the evidence somewhere a juror can read it and return
 *   its uri. The storage adapter is handed in for that.
 * - ruling() returns null while pending.
 */
export interface DisputeAdapter {
  readonly name: 'local' | 'kleros';
  open(evidence: DisputeEvidence): Promise<{ disputeId: string; uri: string; url?: string }>;
  status(disputeId: string): Promise<DisputeStatus>;
  ruling(disputeId: string, opts?: { waitMs?: number }): Promise<Ruling | null>;
  health(): Promise<{ ok: boolean; detail?: string }>;
}
