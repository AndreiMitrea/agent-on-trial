import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { decodeDataUri, encodeDataUri, hashBytes, isDataUri } from '@trial/shared';
import { NotImplemented, type PutOptions, type StorageAdapter, type StoredRef } from './types.js';

/**
 * The default. Writes every file to evidence/store/<hash>.<ext> and returns a
 * data: URI, so the on-chain pointer resolves with no server at all. Same
 * hashes as the Swarm adapter, so a run can switch adapters without changing
 * anything the chain sees except the URI scheme.
 */
export class LocalStorage implements StorageAdapter {
  readonly name = 'local' as const;
  constructor(private readonly dir = 'evidence/store') {}

  async put(content: Uint8Array | string, opts: PutOptions = {}): Promise<StoredRef> {
    const bytes = typeof content === 'string' ? new TextEncoder().encode(content) : content;
    const hash = hashBytes(bytes);
    const ext = (opts.contentType ?? 'application/json').includes('json') ? 'json' : 'bin';
    await mkdir(this.dir, { recursive: true });
    await writeFile(join(this.dir, `${hash}.${ext}`), bytes);
    const uri = encodeDataUri(Buffer.from(bytes).toString('utf8'));
    return { uri, hash, bytes: bytes.length };
  }

  async get(uri: string): Promise<Uint8Array> {
    if (isDataUri(uri)) return new TextEncoder().encode(decodeDataUri(uri));
    if (uri.startsWith('file://')) return new Uint8Array(await readFile(new URL(uri)));
    throw new Error(`local storage cannot read ${uri.slice(0, 40)}`);
  }

  async feedUpdate(topic: string, uri: string) {
    const dir = join(this.dir, 'feeds');
    await mkdir(dir, { recursive: true });
    const path = join(dir, `${safe(topic)}.txt`);
    await writeFile(path, uri);
    return { feedUri: `file://${process.cwd()}/${path}` };
  }

  async feedRead(topic: string): Promise<string | null> {
    try {
      return (await readFile(join(this.dir, 'feeds', `${safe(topic)}.txt`), 'utf8')).trim() || null;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw err;
    }
  }

  async health() {
    try {
      await mkdir(this.dir, { recursive: true });
      return { ok: true, detail: `writes to ${this.dir}` };
    } catch (err) {
      return { ok: false, detail: String(err) };
    }
  }
}

function safe(topic: string) {
  return topic.replace(/[^a-z0-9_-]/gi, '_');
}

// Exported so the swarm adapter can reuse the error type without a cycle.
export { NotImplemented };
