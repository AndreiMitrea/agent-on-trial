# The shady provider

A real x402 paywall that takes 0.01 USD₮ and returns a "market report" with none of the sections it advertises. It exists so the dispute in act 4 is staged against something we control, on mainnet, with real settlement through `api.x402.celo.org`.

- `paywall.yml` is a `buy gate` config: `network: celo`, `tokens: [USDT]`, `/report/*` priced at 0.01 USDT, `/health` free. The step script copies it to `.runs/shady-paywall.yml` with `payTo` filled in.
- `gate.ts` starts and stops the gate. Needs `BUY_FACILITATOR_API_KEY` (an `x402_…` key from https://x402.celo.org) and `SHADY_PAY_TO` (defaults to the shady key's address, which defaults to the counterparty key).
- `register.ts` mints the provider's ERC-8004 identity once and appends `SHADY_AGENT_ID` to `.env`. It starts with zero feedback.

```bash
pnpm shady:register                      # once
pnpm shady:serve                         # serves http://localhost:4402
pnpm exec buy --account defendant curl --token USDT http://localhost:4402/report/celo
```

Act 4 does all of this itself; these commands are for trying the paywall on its own.
