import type { EvidenceStore } from '../lib/evidence.js';
import type { Memory } from './tools/memory.js';

/**
 * What one act leaves behind for the step script: raw artifacts the tools
 * recorded (payout tx, receipts, dispute ids). The step turns them into exhibits.
 */
export type Artifact =
  | { kind: 'askbots_payout'; projectId: string; projectName: string; txHash: string; payout: string; currency: string }
  | { kind: 'askbots_review'; projectId: string; projectName: string; outcome: string; detail?: string }
  | { kind: 'x402_receipt'; url: string; txHash?: string; amount: string; asset: string; network: string; raw: Record<string, unknown> }
  | { kind: 'x402_response'; url: string; body: string }
  | { kind: 'dispute'; disputeId: string; uri: string; url?: string; providerAgentId?: string; providerEndpoint: string; receiptTxHash: string; expected: string; deliveredUri: string; deliveredHash: string; claim: string }
  | { kind: 'memory'; uri: string; hash: string; gatewayUrl?: string; entries: number };

export interface ActContext {
  evidence: EvidenceStore;
  memory: Memory;
  artifacts: Artifact[];
  /** Filled by the step before the act. */
  params: { shadyUrl?: string; shadyAgentId?: string; propertyUrl?: string };
}

export function lastArtifact<K extends Artifact['kind']>(ctx: ActContext, kind: K): Extract<Artifact, { kind: K }> | undefined {
  for (let i = ctx.artifacts.length - 1; i >= 0; i--) {
    const a = ctx.artifacts[i];
    if (a.kind === kind) return a as Extract<Artifact, { kind: K }>;
  }
  return undefined;
}
