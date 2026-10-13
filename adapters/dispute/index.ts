import { getStorage } from '../storage/index.js';
import type { StorageAdapter } from '../storage/types.js';
import { KlerosDispute } from './kleros.js';
import { LocalDispute } from './local.js';
import type { DisputeAdapter } from './types.js';

export type { DisputeAdapter, DisputeEvidence, DisputeStatus, Ruling } from './types.js';

let cached: DisputeAdapter | null = null;

/** DISPUTE=local|kleros. Unknown values fail at startup, not mid-run. */
export function getDispute(env: NodeJS.ProcessEnv = process.env, storage: StorageAdapter = getStorage(env)): DisputeAdapter {
  if (cached) return cached;
  cached = makeDispute((env.DISPUTE ?? 'local').toLowerCase(), storage, env);
  return cached;
}

export function makeDispute(which: string, storage: StorageAdapter, env: NodeJS.ProcessEnv = process.env): DisputeAdapter {
  if (which === 'local') return new LocalDispute(storage);
  if (which === 'kleros') return new KlerosDispute(storage, env);
  throw new Error(`DISPUTE=${which} is not one of local, kleros`);
}
