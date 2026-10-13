import { DEFAULT_RPC } from '@trial/shared';

export const DEFAULT_GATEWAY = 'https://api.gateway.ethswarm.org';
export const DEFAULT_MODEL = 'claude-opus-5-5';

export function rpcUrl(): string {
  return process.env.CELO_RPC_URL || DEFAULT_RPC;
}

export function gatewayUrl(): string {
  return (process.env.SWARM_GATEWAY_URL || DEFAULT_GATEWAY).replace(/\/+$/, '');
}

export function anthropicModel(): string {
  return process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
}

/** Public origin of this app, for the QR code and self links. */
export function baseUrl(req?: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_COURTROOM_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, '');
  if (req) return new URL(req.url).origin;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}
