/**
 * Celo mainnet constants. The demo is mainnet only.
 */
export const CHAIN_ID = 42220;
export const CAIP2 = 'eip155:42220';
export const DEFAULT_RPC = 'https://forno.celo.org';

/** ERC-8004 v2.0.0 registries on Celo mainnet. */
export const IDENTITY_REGISTRY = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432' as const;
export const REPUTATION_REGISTRY = '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63' as const;
/** CAIP-10 style registry id used in registration and feedback files. */
export const AGENT_REGISTRY = `eip155:${CHAIN_ID}:${IDENTITY_REGISTRY}`;

/** Stablecoins the x402 facilitator settles. All 6 decimals, all EIP-3009. */
export const TOKENS = {
  USDT: { address: '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e', symbol: 'USDT', decimals: 6, display: 'USD₮' },
  USDC: { address: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C', symbol: 'USDC', decimals: 6, display: 'USDC' },
  USAT: { address: '0xD2ab3C9A02DBBAB236BfEC45D1d755DF4267F771', symbol: 'USAT', decimals: 6, display: 'USA₮' },
} as const;
export type TokenSymbol = keyof typeof TOKENS;
/** The one token this demo uses for every payment. */
export const DEMO_TOKEN = TOKENS.USDT;

/** Live services. */
export const FACILITATOR_URL = 'https://api.x402.celo.org';
export const FACILITATOR_DASHBOARD = 'https://x402.celo.org';
export const ASKBOTS_URL = 'https://askbots.ai';
export const ASKBOTS_ESCROW = '0x58166D5422717F3Db0c4c76139dE6FB11D4a09cf' as const;
export const USEBUY_URL = 'https://usebuy.ai';
export const EXPLORER = 'https://celoscan.io';

export const celoscanTx = (hash: string) => `${EXPLORER}/tx/${hash}`;
export const celoscanAddress = (address: string) => `${EXPLORER}/address/${address}`;
export const celoscanToken = (address: string, token = DEMO_TOKEN.address) =>
  `${EXPLORER}/token/${token}?a=${address}`;

export function tokenBySymbol(symbol: string) {
  const t = TOKENS[symbol.toUpperCase() as TokenSymbol];
  if (!t) throw new Error(`unknown token ${symbol}; expected one of ${Object.keys(TOKENS).join(', ')}`);
  return t;
}

export function tokenByAddress(address: string) {
  const lower = address.toLowerCase();
  return Object.values(TOKENS).find((t) => t.address.toLowerCase() === lower) ?? null;
}

/** "0.10" -> 100000n for a 6-decimal token. */
export function parseUnits6(amount: string | number): bigint {
  const [whole, frac = ''] = String(amount).split('.');
  const padded = (frac + '000000').slice(0, 6);
  return BigInt(whole) * 1_000_000n + BigInt(padded);
}

/** 100000n -> "0.10". */
export function formatUnits6(units: bigint | string | number, minFrac = 2): string {
  const n = BigInt(units);
  const whole = n / 1_000_000n;
  let frac = (n % 1_000_000n).toString().padStart(6, '0').replace(/0+$/, '');
  if (frac.length < minFrac) frac = frac.padEnd(minFrac, '0');
  return frac ? `${whole}.${frac}` : `${whole}`;
}
