import { LocalStorage } from './local.js';
import { SwarmStorage } from './swarm.js';
import type { StorageAdapter } from './types.js';

export type { StorageAdapter, StoredRef } from './types.js';
export { NotImplemented } from './types.js';

let cached: StorageAdapter | null = null;

/** STORAGE=local|swarm. Unknown values fail at startup, not mid-run. */
export function getStorage(env: NodeJS.ProcessEnv = process.env): StorageAdapter {
  if (cached) return cached;
  const which = (env.STORAGE ?? 'local').toLowerCase();
  if (which === 'local') cached = new LocalStorage();
  else if (which === 'swarm') cached = new SwarmStorage(env);
  else throw new Error(`STORAGE=${which} is not one of local, swarm`);
  return cached;
}

/** For tests and checks that want a fresh instance. */
export function makeStorage(which: 'local' | 'swarm', env: NodeJS.ProcessEnv = process.env): StorageAdapter {
  return which === 'local' ? new LocalStorage() : new SwarmStorage(env);
}
