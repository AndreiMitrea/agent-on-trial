import { z } from 'zod';

/**
 * One exhibit per thing the audience can check. Ids are letter + number:
 *   A identity and reputation, B payments, C memory, D dispute, V verdict.
 */
export const ExhibitKind = z.enum(['tx', 'ref', 'http', 'read', 'note']);

export const Exhibit = z.object({
  id: z.string().regex(/^[ABCDV]\d+$/),
  act: z.enum(['identity', 'earn', 'spend', 'dispute', 'verdict']),
  kind: ExhibitKind,
  title: z.string(),
  at: z.string(),
  /** On-chain transaction, when kind = tx. */
  txHash: z.string().optional(),
  /** Storage pointer, when kind = ref: bzz://… or data:… */
  uri: z.string().optional(),
  /** keccak256 of the stored bytes. */
  hash: z.string().optional(),
  /** Browser-openable URL for uri. */
  gatewayUrl: z.string().optional(),
  /** Explorer or service link. */
  url: z.string().optional(),
  /** Anything else worth showing. Keep it small. */
  detail: z.record(z.string(), z.unknown()).optional(),
  /** True when loaded from evidence/fixtures.json instead of produced live. */
  fixture: z.boolean().optional(),
});
export type Exhibit = z.infer<typeof Exhibit>;

export const Evidence = z.object({
  runId: z.string(),
  round: z.string(),
  startedAt: z.string(),
  agentId: z.string().optional(),
  agentAddress: z.string().optional(),
  shadyAgentId: z.string().optional(),
  exhibits: z.array(Exhibit),
});
export type Evidence = z.infer<typeof Evidence>;

/** One line of the public live log. Same lines in the terminal and on /live. */
export const LogKind = z.enum(['host', 'agent', 'tool_call', 'tool_result', 'tx', 'info', 'warn', 'error', 'approve']);
export const LogLine = z.object({
  at: z.string(),
  kind: LogKind,
  text: z.string(),
  data: z.record(z.string(), z.unknown()).optional(),
});
export type LogLine = z.infer<typeof LogLine>;

/** The fixtures file: one recorded exhibit list per act. */
export const Fixtures = z.object({
  recordedAt: z.string().optional(),
  agentId: z.string().optional(),
  agentAddress: z.string().optional(),
  shadyAgentId: z.string().optional(),
  acts: z.record(z.string(), z.array(Exhibit)),
});
export type Fixtures = z.infer<typeof Fixtures>;

export const VoteTally = z.object({
  round: z.string(),
  trust: z.number().int().nonnegative(),
  distrust: z.number().int().nonnegative(),
  voters: z.number().int().nonnegative(),
  open: z.boolean(),
  closedAt: z.string().optional(),
});
export type VoteTally = z.infer<typeof VoteTally>;

export function pctTrust(t: Pick<VoteTally, 'trust' | 'distrust'>): number {
  const total = t.trust + t.distrust;
  return total === 0 ? 0 : Math.round((t.trust / total) * 100);
}
