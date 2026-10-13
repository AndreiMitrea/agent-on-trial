import { describe, expect, it } from 'vitest';
import {
  Evidence,
  Exhibit,
  buildFeedbackFile,
  buildRegistrationFile,
  canonicalJson,
  decodeDataUri,
  encodeDataUri,
  formatUnits6,
  hashBytes,
  parseUnits6,
  pctTrust,
  AGENT_REGISTRY,
} from '@trial/shared';

describe('registration and feedback files', () => {
  it('builds a registration-v1 document with the registry id once minted', () => {
    const empty = buildRegistrationFile({ name: 'x', description: 'y', services: [] });
    expect(empty.registrations).toEqual([]);
    const minted = buildRegistrationFile({ name: 'x', description: 'y', services: [], agentId: '42' });
    expect(minted.registrations).toEqual([{ agentId: 42, agentRegistry: AGENT_REGISTRY }]);
    expect(minted.supportedTrust).toEqual(['reputation']);
    expect(minted.x402Support).toBe(true);
  });

  it('round-trips a feedback file through a data: URI with a stable hash', () => {
    const file = buildFeedbackFile({ agentId: 7, clientAddress: 'eip155:42220:0x1', createdAt: '2026-01-01T00:00:00Z', value: 100, tag1: 'earned', tag2: 'askbots-review', endpoint: 'https://askbots.ai' });
    const json = canonicalJson(file);
    const uri = encodeDataUri(json);
    expect(decodeDataUri(uri)).toBe(json);
    expect(hashBytes(json)).toBe(hashBytes(new TextEncoder().encode(json)));
    expect(hashBytes(json)).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('canonicalJson sorts keys so the hash does not depend on insertion order', () => {
    expect(canonicalJson({ b: 1, a: { d: 2, c: 3 } })).toBe('{"a":{"c":3,"d":2},"b":1}');
  });
});

describe('units', () => {
  it('parses and formats 6-decimal amounts', () => {
    expect(parseUnits6('0.10')).toBe(100_000n);
    expect(parseUnits6('1')).toBe(1_000_000n);
    expect(formatUnits6(100_000n)).toBe('0.10');
    expect(formatUnits6(10_000n)).toBe('0.01');
    expect(formatUnits6(1_234_567n)).toBe('1.234567');
  });
});

describe('evidence schema', () => {
  it('accepts a minimal run and rejects a bad exhibit id', () => {
    const ok = Evidence.parse({ runId: 'r', round: 'test', startedAt: 'now', exhibits: [{ id: 'A1', act: 'identity', kind: 'note', title: 't', at: 'now' }] });
    expect(ok.exhibits[0].id).toBe('A1');
    expect(() => Exhibit.parse({ id: 'Z1', act: 'identity', kind: 'note', title: 't', at: 'now' })).toThrow();
  });

  it('computes percent trust', () => {
    expect(pctTrust({ trust: 7, distrust: 3 })).toBe(70);
    expect(pctTrust({ trust: 0, distrust: 0 })).toBe(0);
  });
});
