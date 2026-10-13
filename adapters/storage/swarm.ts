import { hashBytes } from '@trial/shared';
import { NotImplemented, type PutOptions, type StorageAdapter, type StoredRef } from './types.js';

/**
 * Swarm storage over the Bee HTTP API.
 *
 * Shipped: put() and get() over /bzz. Open for Solar Punk: feeds (feedUpdate /
 * feedRead) with bee-js and SWARM_FEED_PRIVATE_KEY, and whatever else you want
 * the audience to see (postage batch on the board, feed-based memory head,
 * your MCP server driving this adapter instead of fetch).
 *
 * Env: BEE_API_URL (default public gateway), SWARM_POSTAGE_BATCH_ID,
 * SWARM_GATEWAY_URL (for browser links), SWARM_FEED_PRIVATE_KEY.
 *
 * Verify: pnpm check:storage
 */
export class SwarmStorage implements StorageAdapter {
  readonly name = 'swarm' as const;
  private readonly api: string;
  private readonly gateway: string;
  private readonly batch?: string;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.api = (env.BEE_API_URL ?? 'https://api.gateway.ethswarm.org').replace(/\/$/, '');
    this.gateway = (env.SWARM_GATEWAY_URL ?? this.api).replace(/\/$/, '');
    this.batch = env.SWARM_POSTAGE_BATCH_ID || undefined;
  }

  async put(content: Uint8Array | string, opts: PutOptions = {}): Promise<StoredRef> {
    const bytes = typeof content === 'string' ? new TextEncoder().encode(content) : content;
    const headers: Record<string, string> = {
      'content-type': opts.contentType ?? 'application/json',
    };
    if (this.batch) headers['swarm-postage-batch-id'] = this.batch;
    const res = await fetch(`${this.api}/bzz`, { method: 'POST', headers, body: new Blob([bytes as BlobPart]) });
    if (!res.ok) {
      throw new Error(`bee POST /bzz ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
    const { reference } = (await res.json()) as { reference: string };
    if (!/^[0-9a-f]{64}$/i.test(reference)) throw new Error(`bee returned an odd reference: ${reference}`);
    return {
      uri: `bzz://${reference}`,
      hash: hashBytes(bytes),
      gatewayUrl: `${this.gateway}/bzz/${reference}/`,
      bytes: bytes.length,
    };
  }

  async get(uri: string): Promise<Uint8Array> {
    const ref = refOf(uri);
    const res = await fetch(`${this.api}/bzz/${ref}/`);
    if (!res.ok) throw new Error(`bee GET /bzz/${ref} ${res.status}`);
    return new Uint8Array(await res.arrayBuffer());
  }

  // TODO(Solar Punk): bee-js feeds. topic -> keccak of the topic string, signer
  // from SWARM_FEED_PRIVATE_KEY, update with the reference of `uri`, return the
  // feed manifest reference as bzz:// and a gateway URL.
  async feedUpdate(_topic: string, _uri: string): Promise<{ feedUri: string; gatewayUrl?: string }> {
    throw new NotImplemented('Swarm feeds');
  }

  async feedRead(_topic: string): Promise<string | null> {
    throw new NotImplemented('Swarm feeds');
  }

  async health() {
    try {
      const res = await fetch(`${this.api}/health`);
      const text = (await res.text()).slice(0, 120);
      return { ok: res.ok, detail: `${this.api} ${res.status} ${text}${this.batch ? '' : ' (no postage batch set)'}` };
    } catch (err) {
      return { ok: false, detail: String(err) };
    }
  }
}

export function refOf(uri: string): string {
  const m = uri.match(/^bzz:\/\/([0-9a-f]{64})\/?$/i);
  if (!m) throw new Error(`not a bzz:// reference: ${uri.slice(0, 40)}`);
  return m[1].toLowerCase();
}
