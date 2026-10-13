import { keccak256, toBytes, type Hex } from 'viem';
import { AGENT_REGISTRY } from './chain.js';

export const REGISTRATION_TYPE = 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1';
export const DATA_URI_PREFIX = 'data:application/json;base64,';

export interface RegistrationService {
  name: string;
  endpoint: string;
  version?: string;
}

/**
 * EIP-8004 registration-v1 document. `registrations` stays empty until an
 * agentId is minted; the courtroom serves the live version at /agent/registration.json.
 */
export function buildRegistrationFile(p: {
  name: string;
  description: string;
  image?: string;
  services: RegistrationService[];
  agentId?: string | number | null;
  agentRegistry?: string;
  x402Support?: boolean;
}) {
  return {
    type: REGISTRATION_TYPE,
    name: p.name,
    description: p.description,
    ...(p.image ? { image: p.image } : {}),
    services: p.services,
    x402Support: p.x402Support ?? true,
    active: true,
    registrations: p.agentId ? [{ agentId: Number(p.agentId), agentRegistry: p.agentRegistry ?? AGENT_REGISTRY }] : [],
    supportedTrust: ['reputation'],
  };
}

export interface ProofOfPayment {
  fromAddress: string;
  toAddress: string;
  chainId: string;
  txHash: string;
}

/**
 * The off-chain feedback file from EIP-8004 (reputation section): mandatory
 * fields first, then what this demo attaches so the file explains itself.
 */
export function buildFeedbackFile(p: {
  agentId: string | number;
  clientAddress: string;
  createdAt: string;
  value: number;
  valueDecimals?: number;
  tag1: string;
  tag2?: string;
  endpoint?: string;
  proofOfPayment?: ProofOfPayment;
  evidence?: Record<string, unknown>;
  agentRegistry?: string;
}) {
  return {
    agentRegistry: p.agentRegistry ?? AGENT_REGISTRY,
    agentId: Number(p.agentId),
    clientAddress: p.clientAddress,
    createdAt: p.createdAt,
    value: p.value,
    valueDecimals: p.valueDecimals ?? 0,
    tag1: p.tag1,
    ...(p.tag2 !== undefined ? { tag2: p.tag2 } : {}),
    ...(p.endpoint !== undefined ? { endpoint: p.endpoint } : {}),
    ...(p.proofOfPayment !== undefined ? { proofOfPayment: p.proofOfPayment } : {}),
    ...(p.evidence !== undefined ? { evidence: p.evidence } : {}),
  };
}

/** Canonical bytes for any evidence file: stable key order, no whitespace. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .sort()
        .map((k) => [k, sortKeys((value as Record<string, unknown>)[k])]),
    );
  }
  return value;
}

/** keccak256 of the exact bytes, as the EIP requires for non-content-addressed URIs. */
export function hashBytes(bytes: Uint8Array | string): Hex {
  return keccak256(typeof bytes === 'string' ? toBytes(bytes) : bytes);
}

/** Inline a JSON file as a data: URI so nothing has to be hosted. */
export function encodeDataUri(json: string): string {
  return `${DATA_URI_PREFIX}${Buffer.from(json, 'utf8').toString('base64')}`;
}

export function isDataUri(uri: string): boolean {
  return uri.startsWith(DATA_URI_PREFIX);
}

export function decodeDataUri(uri: string): string {
  if (!isDataUri(uri)) throw new Error(`not a ${DATA_URI_PREFIX} URI`);
  return Buffer.from(uri.slice(DATA_URI_PREFIX.length), 'base64').toString('utf8');
}
