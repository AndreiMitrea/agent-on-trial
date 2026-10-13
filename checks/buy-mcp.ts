import { connectBuy, disconnectBuy } from '../agent/tools/buy-mcp.js';

/**
 * pnpm check:buy
 *
 * Connects to `buy mcp serve` and lists the tools the agent will see, with
 * whether each takes a `token` argument (the agent always passes USDT).
 */
async function main() {
  const client = await connectBuy();
  const { tools } = (await client.listTools()) as { tools: Array<{ name: string; description?: string; inputSchema: { properties?: Record<string, unknown> } }> };
  for (const t of tools) {
    const props = Object.keys(t.inputSchema.properties ?? {});
    console.log(`${t.name.padEnd(20)} token:${props.includes('token') ? 'yes' : 'no '}  args: ${props.join(', ') || '-'}`);
  }
  await disconnectBuy();
}

main().catch(async (err) => {
  console.error(String(err));
  await disconnectBuy();
  process.exit(1);
});
