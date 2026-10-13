import { z } from 'zod';

export const DEFAULT_ROUND = 'test';
export const LOG_CAP = 5000;

/** Round ids end up inside Redis keys, so keep them to a safe alphabet. */
export const RoundId = z.string().regex(/^[a-zA-Z0-9_-]{1,32}$/, 'round must be 1-32 chars of a-z, 0-9, _ or -');

export const K = {
  round: 'round:current',
  agentId: 'agent:id',
  evidence: (r: string) => `evidence:${r}`,
  log: (r: string) => `log:${r}`,
  tally: (r: string) => `tally:${r}`,
  voters: (r: string) => `voters:${r}`,
  voteOpen: (r: string) => `vote:${r}:open`,
  voteClosedAt: (r: string) => `vote:${r}:closedAt`,
  statements: (r: string) => `statements:${r}`,
} as const;
