import { createPublicClient, http, type Address } from 'viem';
import { celo } from 'viem/chains';
import {
  IDENTITY_REGISTRY,
  IDENTITY_REGISTRY_ABI,
  REPUTATION_REGISTRY,
  REPUTATION_REGISTRY_ABI,
  isDataUri,
  decodeDataUri,
} from '@trial/shared';
import { gatewayUrl, rpcUrl } from './env';
import { fetchUriText } from './uri';

export const SUMMARY_TAGS = ['earned', 'paid', 'dispute', 'ruling', 'jury', 'askbots'] as const;
export type SummaryTag = (typeof SUMMARY_TAGS)[number];

export interface TagSummary {
  count: number;
  /** summaryValue scaled by its decimals. */
  value: number;
  decimals: number;
}

export interface FeedbackEntry {
  client: Address;
  index: number;
  value: number;
  decimals: number;
  tag1: string;
  tag2: string;
  revoked: boolean;
}

export interface AgentSummary {
  agentId: string;
  owner: Address | null;
  wallet: Address | null;
  tokenURI: string | null;
  registration: unknown;
  registrationError?: string;
  clients: Address[];
  summary: Partial<Record<SummaryTag, TagSummary>>;
  feedback: FeedbackEntry[];
  fetchedAt: string;
}

const CACHE_MS = 5_000;
const FEEDBACK_CAP = 10;
const cache = new Map<string, { at: number; data: AgentSummary }>();

function makeClient() {
  return createPublicClient({ chain: celo, transport: http(rpcUrl()) });
}
let client: ReturnType<typeof makeClient> | null = null;
function publicClient(): ReturnType<typeof makeClient> {
  if (!client) client = makeClient();
  return client;
}

async function safe<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await p;
  } catch {
    return null;
  }
}

function scaled(value: bigint, decimals: number): number {
  return Number(value) / 10 ** decimals;
}

async function loadRegistration(tokenURI: string): Promise<{ registration: unknown; registrationError?: string }> {
  try {
    const text = isDataUri(tokenURI) ? decodeDataUri(tokenURI) : await fetchUriText(tokenURI, gatewayUrl(), 64_000);
    return { registration: JSON.parse(text) };
  } catch (e) {
    return { registration: null, registrationError: e instanceof Error ? e.message : String(e) };
  }
}

async function loadFeedback(agentId: bigint, clients: Address[]): Promise<FeedbackEntry[]> {
  if (clients.length === 0) return [];
  const pc = publicClient();
  const lastIndexes = await Promise.all(
    clients.map((c) =>
      safe(
        pc.readContract({
          address: REPUTATION_REGISTRY,
          abi: REPUTATION_REGISTRY_ABI,
          functionName: 'getLastIndex',
          args: [agentId, c],
        }),
      ),
    ),
  );
  // Feedback indexes are 1-based in the v2 registry; getLastIndex is 0 when a client has none.
  const perClient = Math.max(1, Math.ceil(FEEDBACK_CAP / clients.length));
  const targets: { client: Address; index: bigint }[] = [];
  clients.forEach((c, i) => {
    const last = lastIndexes[i] ?? 0n;
    for (let k = 0n; k < BigInt(perClient) && last - k >= 1n; k++) targets.push({ client: c, index: last - k });
  });
  const entries = await Promise.all(
    targets.slice(0, FEEDBACK_CAP).map(async (t) => {
      const r = await safe(
        pc.readContract({
          address: REPUTATION_REGISTRY,
          abi: REPUTATION_REGISTRY_ABI,
          functionName: 'readFeedback',
          args: [agentId, t.client, t.index],
        }),
      );
      if (!r) return null;
      const [value, decimals, tag1, tag2, revoked] = r;
      return { client: t.client, index: Number(t.index), value: scaled(value, decimals), decimals, tag1, tag2, revoked };
    }),
  );
  return entries.filter((e): e is FeedbackEntry => e !== null);
}

export async function agentSummary(id: string): Promise<AgentSummary> {
  const hit = cache.get(id);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;

  const agentId = BigInt(id);
  const pc = publicClient();
  const identity = { address: IDENTITY_REGISTRY, abi: IDENTITY_REGISTRY_ABI } as const;
  const reputation = { address: REPUTATION_REGISTRY, abi: REPUTATION_REGISTRY_ABI } as const;

  const [owner, tokenURI, wallet, clientsRaw] = await Promise.all([
    safe(pc.readContract({ ...identity, functionName: 'ownerOf', args: [agentId] })),
    safe(pc.readContract({ ...identity, functionName: 'tokenURI', args: [agentId] })),
    safe(pc.readContract({ ...identity, functionName: 'getAgentWallet', args: [agentId] })),
    safe(pc.readContract({ ...reputation, functionName: 'getClients', args: [agentId] })),
  ]);
  const clients = [...(clientsRaw ?? [])];

  const summaries = await Promise.all(
    SUMMARY_TAGS.map(async (tag1) => {
      if (clients.length === 0) return [tag1, null] as const;
      const r = await safe(
        pc.readContract({ ...reputation, functionName: 'getSummary', args: [agentId, clients, tag1, ''] }),
      );
      if (!r) return [tag1, null] as const;
      const [count, value, decimals] = r;
      return [tag1, { count: Number(count), value: scaled(value, decimals), decimals }] as const;
    }),
  );
  const summary: Partial<Record<SummaryTag, TagSummary>> = {};
  for (const [tag1, s] of summaries) if (s && s.count > 0) summary[tag1] = s;

  const [feedback, reg] = await Promise.all([
    loadFeedback(agentId, clients),
    tokenURI ? loadRegistration(tokenURI) : Promise.resolve({ registration: null }),
  ]);

  const data: AgentSummary = {
    agentId: id,
    owner,
    wallet,
    tokenURI,
    ...reg,
    clients,
    summary,
    feedback,
    fetchedAt: new Date().toISOString(),
  };
  cache.set(id, { at: Date.now(), data });
  return data;
}

export async function txSucceeded(hash: `0x${string}`): Promise<{ ok: boolean; status: string }> {
  try {
    const receipt = await publicClient().getTransactionReceipt({ hash });
    return { ok: receipt.status === 'success', status: receipt.status };
  } catch (e) {
    return { ok: false, status: e instanceof Error ? e.message : 'not found' };
  }
}
