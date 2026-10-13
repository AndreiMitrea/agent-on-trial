# Plug in Kleros

Act 4 is a purchase that goes wrong. The agent pays 0.01 USD₮ for a market report "with sections: price, volume, sources" and gets a body with none of them. It opens a dispute. Today the dispute is ruled by a deterministic local arbitrator. The interface is built so Kleros rules it instead.

## The interface

`adapters/dispute/types.ts`:

```ts
interface DisputeEvidence {
  complainant: { address; agentId };
  respondent: { address; agentId?; endpoint };
  receipt: { txHash; amount; asset; network: 'eip155:42220'; receiptRef: StoredRef };
  expected: string;          // the advertised spec
  delivered: StoredRef;      // what came back, stored verbatim
  memory?: StoredRef;        // the complainant's memory head
  claim: string;             // one paragraph from the complainant
}

interface Ruling { winner: 'complainant' | 'respondent' | 'refused'; rationale: string; ruledAt: string;
                   ref?: StoredRef; externalId?: string; proofUrl?: string }

interface DisputeAdapter {
  readonly name: 'local' | 'kleros';
  open(evidence: DisputeEvidence): Promise<{ disputeId: string; uri: string; url?: string }>;
  status(disputeId: string): Promise<'open' | 'evidence' | 'ruled' | 'closed'>;
  ruling(disputeId: string, opts?: { waitMs?: number }): Promise<Ruling | null>;   // null while pending
  health(): Promise<{ ok: boolean; detail?: string }>;
}
```

Rules:
- The adapter never signs on Celo. The step script writes the ERC-8004 feedback from what you return: `dispute` on the provider from the agent's key when the dispute opens, `ruling` on both parties from the arbitrator key when `ruling()` returns.
- `open` gets the storage adapter in the constructor. The evidence is already content addressed (Swarm or `data:`), so its `uri` can be the evidence URI you hand to jurors as is.
- `ruling` returns `null` while pending. The show does not wait longer than `waitMs`; a pending ruling becomes a "pending" exhibit and the ruling can be written later.

## What is open for you

`adapters/dispute/kleros.ts` is a stub with the shape filled in:

1. **`open`.** Create the dispute on your arbitrable contract (Kleros Escrow v2, or an `IArbitrableV2` of your own) on the chain where Kleros Court v2 runs. Env: `KLEROS_RPC_URL`, `KLEROS_PRIVATE_KEY`, `KLEROS_ARBITRABLE_ADDRESS`. Return the on-chain dispute id, the evidence URI, and the court URL.
2. **`status`.** Read the dispute period and map it.
3. **`ruling`.** Once executed, read `ruling(disputeId)`: 1 is the complainant, 2 the respondent, 0 refused. Fill `proofUrl` with the explorer link to the execution transaction and `externalId` with the dispute id.
4. **The bridge.** Kleros is not on Celo. The ruling feedback on Celo is signed by our arbitrator key and quotes `proofUrl` in its evidence file. If you want the ruling itself to be the signer, that is a relayer or a bridge, and it is the interesting follow-up.
5. **The jury on stage.** The audience vote in act 5 is a jury with no stake. If you want to show real jurors, a dispute opened in rehearsal and ruled before the show gives you a `D` exhibit with a court URL to open on stage.

## Env

```
DISPUTE=kleros
KLEROS_RPC_URL=
KLEROS_PRIVATE_KEY=
KLEROS_ARBITRABLE_ADDRESS=
```

## Verify

```bash
DISPUTE=kleros pnpm check:dispute --wait 60000
```

It opens a dispute from a fixture receipt and a junk body, checks the returned shape, polls `status`, and prints the ruling or "pending" with the external id. With the local adapter it prints the complainant winning in under a second; that is the bar.
