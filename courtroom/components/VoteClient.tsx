'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { VoteTally } from '@trial/shared';
import { TallyBar } from './TallyBar';

type Choice = 'trust' | 'distrust';

export function VoteClient() {
  const params = useSearchParams();
  const fromQuery = params.get('r');
  const [round, setRound] = useState<string | null>(fromQuery);
  const [tally, setTally] = useState<VoteTally | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (fromQuery) return;
    fetch('/api/round', { cache: 'no-store' })
      .then((r) => r.json() as Promise<{ round?: string; error?: string }>)
      .then((b) => (b.round ? setRound(b.round) : setMessage(b.error ?? 'No round.')))
      .catch(() => setMessage('Could not load the round.'));
  }, [fromQuery]);

  async function vote(choice: Choice) {
    if (!round || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ round, choice }),
      });
      const body = (await res.json()) as VoteTally | { error?: string };
      if (res.ok) {
        setTally(body as VoteTally);
        setDone(true);
        setMessage('Your vote is in.');
      } else if (res.status === 409) {
        const err = (body as { error?: string }).error ?? '';
        setMessage(err.includes('closed') ? 'The vote is not open.' : 'You already voted.');
        if (err.includes('already')) setDone(true);
        const t = await fetch(`/api/vote/tally?round=${encodeURIComponent(round)}`).then((r) => r.json());
        if (t && typeof t.trust === 'number') setTally(t as VoteTally);
      } else {
        setMessage((body as { error?: string }).error ?? `Error ${res.status}`);
      }
    } catch {
      setMessage('Network error. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 px-6 py-10">
      <div>
        <h1 className="text-4xl font-bold leading-tight">Do you trust this agent?</h1>
        <p className="mt-2 text-neutral-400">
          One vote per device. The result is written on chain as ERC-8004 feedback.
          {round && <span className="font-mono"> Round {round}.</span>}
        </p>
      </div>

      {!done && (
        <div className="grid gap-4">
          <button
            type="button"
            disabled={!round || busy}
            onClick={() => vote('trust')}
            className="rounded-2xl bg-emerald-500 py-8 text-4xl font-bold text-neutral-950 active:scale-[0.98] disabled:opacity-50"
          >
            Trust
          </button>
          <button
            type="button"
            disabled={!round || busy}
            onClick={() => vote('distrust')}
            className="rounded-2xl bg-rose-500 py-8 text-4xl font-bold text-neutral-950 active:scale-[0.98] disabled:opacity-50"
          >
            Don&apos;t trust
          </button>
        </div>
      )}

      {message && <p className="text-2xl">{message}</p>}
      {tally && <TallyBar tally={tally} />}
    </main>
  );
}
