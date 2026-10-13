import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod';
import { IDENTITY_REGISTRY, IDENTITY_REGISTRY_ABI, TAGS, ASKBOTS_TAGS } from '@trial/shared';
import { z } from 'zod';
import { publicClient } from '../../lib/clients.js';
import { readRecentFeedback, readReputation } from '../../lib/feedback.js';
import { log } from '../../lib/log.js';

const ALL_TAGS = [...Object.values(TAGS), ASKBOTS_TAGS.tag1];

export function reputationTools() {
  const check_reputation = betaZodTool({
    name: 'check_reputation',
    description: 'Look up an ERC-8004 agent on Celo: owner, registration URI, feedback summary per tag, and the last entries. Use before paying a provider.',
    inputSchema: z.object({ agentId: z.string().regex(/^\d+$/) }),
    run: async ({ agentId }) => {
      log.toolCall('check_reputation', { agentId });
      const out = await lookupAgent(agentId);
      log.toolResult('check_reputation', out.error ?? `${out.summaries?.length ?? 0} tag(s), ${out.clients?.length ?? 0} client(s)`);
      return JSON.stringify(out);
    },
  });
  return [check_reputation];
}

export async function lookupAgent(agentId: string) {
  try {
    const id = BigInt(agentId);
    const [owner, uri] = await Promise.all([
      publicClient.readContract({ address: IDENTITY_REGISTRY, abi: IDENTITY_REGISTRY_ABI, functionName: 'ownerOf', args: [id] }),
      publicClient.readContract({ address: IDENTITY_REGISTRY, abi: IDENTITY_REGISTRY_ABI, functionName: 'tokenURI', args: [id] }),
    ]);
    const { clients, summaries } = await readReputation(agentId, ALL_TAGS);
    const recent = await readRecentFeedback(agentId, 8);
    return { agentId, owner, agentURI: uri, clients, summaries, recent };
  } catch (err) {
    return { agentId, error: `not found or unreadable: ${(err as Error).message.split('\n')[0]}` };
  }
}
