import { celoscanTx } from '@trial/shared';
import type { Exhibit } from '@trial/shared';

export const DEFAULT_GATEWAY_PUBLIC = 'https://api.gateway.ethswarm.org';

export function bzzUrl(ref: string, gateway: string): string {
  return `${gateway}/bzz/${ref}/`;
}

/** The one link that best lets a person check an exhibit. */
export function exhibitHref(ex: Exhibit, gateway: string): { href: string; label: string } | null {
  if (ex.txHash) return { href: celoscanTx(ex.txHash), label: 'celoscan' };
  if (ex.gatewayUrl) return { href: ex.gatewayUrl, label: 'open' };
  if (ex.uri?.startsWith('bzz://')) return { href: bzzUrl(ex.uri.slice('bzz://'.length), gateway), label: 'swarm' };
  if (ex.uri && /^https?:\/\//.test(ex.uri)) return { href: ex.uri, label: 'open' };
  if (ex.url) return { href: ex.url, label: 'open' };
  return null;
}

export const COLUMN_TITLES: Record<string, string> = {
  A: 'Identity',
  B: 'Payments',
  C: 'Memory',
  D: 'Dispute',
  V: 'Verdict',
};
