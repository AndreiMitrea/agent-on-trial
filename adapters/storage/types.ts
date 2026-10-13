import type { Hex } from 'viem';

/**
 * What a stored file looks like from the chain's point of view.
 * `uri` goes on chain as feedbackURI, `hash` as feedbackHash.
 */
export interface StoredRef {
  /** bzz://<reference> for Swarm, data:application/json;base64,… for local. */
  uri: string;
  /** keccak256 of the exact bytes stored. */
  hash: Hex;
  /** A URL a browser can open, when one exists. */
  gatewayUrl?: string;
  bytes: number;
}

export interface PutOptions {
  contentType?: string;
  /** A hint for humans; adapters may ignore it. */
  name?: string;
}

/**
 * The storage plug-in. Solar Punk / Swarm implements this in one file:
 * adapters/storage/swarm.ts. `pnpm check:storage` proves it works.
 *
 * Rules:
 * - put() returns bytes-exact content addressing: get(uri) must hash back to StoredRef.hash.
 * - Adapters never sign Celo transactions. lib/feedback.ts does that with the returned ref.
 * - feeds are optional for the flow: when feedUpdate throws NotImplemented, the
 *   evidence store falls back to a local pointer file.
 */
export interface StorageAdapter {
  readonly name: 'local' | 'swarm';
  put(content: Uint8Array | string, opts?: PutOptions): Promise<StoredRef>;
  get(uri: string): Promise<Uint8Array>;
  /** Mutable pointer: topic -> latest uri. Used for the agent's memory head. */
  feedUpdate(topic: string, uri: string): Promise<{ feedUri: string; gatewayUrl?: string }>;
  feedRead(topic: string): Promise<string | null>;
  health(): Promise<{ ok: boolean; detail?: string }>;
}

export class NotImplemented extends Error {
  constructor(what: string) {
    super(`${what} is not implemented by this adapter`);
    this.name = 'NotImplemented';
  }
}
