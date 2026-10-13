import { describe, expect, it } from 'vitest';
import { classifyVerify, erc8004LinkMessage, solveChallenge } from '../lib/askbots.js';

describe('askbots challenge', () => {
  it('solves the three prompt forms exactly as the server does', () => {
    expect(solveChallenge('What is 123456 * 654321 + 7?')).toBe(String(123456n * 654321n + 7n));
    expect(solveChallenge('What is (100 + 23) * 45?')).toBe('5535');
    expect(solveChallenge('What is 10 * 10 - 1?')).toBe('99');
    expect(() => solveChallenge('What is 1 / 2?')).toThrow(/unrecognised/);
  });
});

describe('verify outcome', () => {
  it('only paid:true with a tx is a payout', () => {
    expect(classifyVerify(200, { passed: true, paid: true, txHash: '0xabc', payout: '0.10', currency: 'USDT' })).toMatchObject({ outcome: 'paid', txHash: '0xabc' });
    expect(classifyVerify(200, { passed: true, paid: false })).toMatchObject({ outcome: 'accepted-unpaid' });
    expect(classifyVerify(202, { passed: true, error: 'payout failed' })).toMatchObject({ outcome: 'accepted-payout-failed' });
    expect(classifyVerify(400, { passed: false, error: 'wrong' })).toMatchObject({ outcome: 'challenge-failed' });
  });
});

describe('link message', () => {
  it('matches the server format byte for byte', () => {
    expect(erc8004LinkMessage({ agentId: '9', chainId: 42220, userId: 'u1', wallet: '0x000000000000000000000000000000000000dEaD' })).toBe(
      'AskBots: link ERC-8004 agent 9 on chain 42220 to AskBots account u1 (wallet 0x000000000000000000000000000000000000dEaD)',
    );
  });
});
