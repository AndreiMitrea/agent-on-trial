import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CAIP2, DEMO_TOKEN, hashBytes } from '@trial/shared';
import { afterAll, describe, expect, it } from 'vitest';
import { LocalDispute, requiredSections } from '../adapters/dispute/local.js';
import { makeDispute } from '../adapters/dispute/index.js';
import { LocalStorage } from '../adapters/storage/local.js';
import { makeStorage } from '../adapters/storage/index.js';
import { refOf } from '../adapters/storage/swarm.js';

const dir = mkdtempSync(join(tmpdir(), 'trial-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe('local storage', () => {
  const storage = new LocalStorage(dir);

  it('is content addressed and readable back', async () => {
    const ref = await storage.put('{"a":1}');
    expect(ref.hash).toBe(hashBytes('{"a":1}'));
    expect(ref.uri.startsWith('data:application/json;base64,')).toBe(true);
    expect(new TextDecoder().decode(await storage.get(ref.uri))).toBe('{"a":1}');
  });

  it('keeps a feed head per topic', async () => {
    expect(await storage.feedRead('t')).toBeNull();
    await storage.feedUpdate('t', 'data:x');
    expect(await storage.feedRead('t')).toBe('data:x');
  });
});

describe('adapter selection', () => {
  it('picks by name and refuses unknown names', () => {
    expect(makeStorage('local').name).toBe('local');
    expect(makeStorage('swarm', { BEE_API_URL: 'http://bee' }).name).toBe('swarm');
    expect(makeDispute('local', makeStorage('local')).name).toBe('local');
    expect(makeDispute('kleros', makeStorage('local'), {}).name).toBe('kleros');
    expect(() => makeDispute('nope', makeStorage('local'))).toThrow(/not one of/);
  });

  it('parses bzz references', () => {
    expect(refOf('bzz://' + 'a'.repeat(64))).toBe('a'.repeat(64));
    expect(() => refOf('bzz://short')).toThrow();
  });
});

describe('local dispute', () => {
  it('rules for the complainant when sections are missing, else for the respondent', async () => {
    const storage = new LocalStorage(dir);
    const dispute = new LocalDispute(storage);
    const junk = await storage.put('{"report":"all good"}');
    const base = {
      complainant: { address: '0x0000000000000000000000000000000000000001' as const, agentId: '1' },
      respondent: { address: '0x0000000000000000000000000000000000000002' as const, endpoint: 'http://x' },
      receipt: { txHash: ('0x' + '11'.repeat(32)) as `0x${string}`, amount: '0.01', asset: DEMO_TOKEN.address, network: CAIP2 as 'eip155:42220', receiptRef: junk },
      expected: 'a Celo market report with sections: price, volume, sources',
      claim: 'nothing of what was promised',
    };
    const a = await dispute.open({ ...base, delivered: junk });
    expect(await dispute.status(a.disputeId)).toBe('open');
    const r = await dispute.ruling(a.disputeId);
    expect(r?.winner).toBe('complainant');
    expect(r?.rationale).toMatch(/price, volume, sources/);
    expect(await dispute.status(a.disputeId)).toBe('ruled');

    const good = await storage.put('{"price":1,"volume":2,"sources":["x"]}');
    const b = await dispute.open({ ...base, delivered: good });
    expect((await dispute.ruling(b.disputeId))?.winner).toBe('respondent');
  });

  it('extracts required sections from the spec', () => {
    expect(requiredSections('a Celo market report with sections: price, volume and sources')).toEqual(['price', 'volume', 'sources']);
    expect(requiredSections('whatever')).toEqual([]);
  });
});
