'use client';

import { useState } from 'react';
import type { Evidence, VoteTally } from '@trial/shared';
import { askStream } from '@/lib/ask-client';
import { usePoll } from '@/lib/use-poll';
import { Cited } from './Cited';
import { TallyBar } from './TallyBar';

type Action = 'open' | 'close' | 'reset' | 'set' | 'current';

export function BenchClient({ round: initialRound, baseUrl }: { round: string; baseUrl: string }) {
  const [round, setRound] = useState(initialRound);
  const [roundInput, setRoundInput] = useState(initialRound);
  const [trustIn, setTrustIn] = useState('');
  const [distrustIn, setDistrustIn] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [statements, setStatements] = useState<{ prosecutor: string; defense: string }>({ prosecutor: '', defense: '' });
  const [generating, setGenerating] = useState(false);

  const q = encodeURIComponent(round);
  const { data: tally, error: tallyError } = usePoll<VoteTally>(`/api/vote/tally?round=${q}`, 2000);
  const { data: evidence } = usePoll<Evidence | null>(`/api/evidence?round=${q}`, 5000);

  async function post(action: Action, extra: Record<string, unknown> = {}) {
    setStatus(null);
    const res = await fetch('/api/vote/round', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ round: action === 'current' ? roundInput : round, action, ...extra }),
    });
    const body = (await res.json()) as { error?: string };
    setStatus(res.ok ? `${action}: ok` : `${action}: ${body.error ?? res.status}`);
    if (res.ok && action === 'current') setRound(roundInput);
  }

  async function generate() {
    setGenerating(true);
    setStatus(null);
    try {
      await askStream({ round, role: 'prosecutor' }, (t) => setStatements((s) => ({ ...s, prosecutor: t })));
      await askStream({ round, role: 'defense' }, (t) => setStatements((s) => ({ ...s, defense: t })));
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'generation failed');
    } finally {
      setGenerating(false);
    }
  }

  const counts = countByAct(evidence);
  const btn = 'rounded-lg border border-neutral-600 px-4 py-2 text-lg hover:bg-neutral-800';
  const input = 'rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-lg';
  const links = ['/live', '/projector', `/vote?r=${q}`, '/cross', '/agent/registration.json', '/.well-known/agent-card.json'];

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-6 py-10">
      <header className="flex items-baseline justify-between">
        <h1 className="text-4xl font-bold">Bench</h1>
        <span className="font-mono text-neutral-400">round {round}</span>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-neutral-300">Round</h2>
        <div className="flex gap-3">
          <input className={input} value={roundInput} onChange={(e) => setRoundInput(e.target.value)} />
          <button type="button" className={btn} onClick={() => post('current')}>
            Set current round
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-neutral-300">Vote</h2>
        <TallyBar tally={tally} />
        {tallyError && <p className="text-rose-400">{tallyError}</p>}
        <div className="flex flex-wrap gap-3">
          <button type="button" className={btn} onClick={() => post('open')}>
            Open vote
          </button>
          <button type="button" className={btn} onClick={() => post('close')}>
            Close vote
          </button>
          <button
            type="button"
            className={`${btn} border-rose-700 text-rose-300`}
            onClick={() => {
              if (window.confirm(`Reset the tally and voters for round ${round}?`)) void post('reset');
            }}
          >
            Reset vote
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input className={`${input} w-28`} placeholder="trust" inputMode="numeric" value={trustIn} onChange={(e) => setTrustIn(e.target.value)} />
          <input
            className={`${input} w-28`}
            placeholder="distrust"
            inputMode="numeric"
            value={distrustIn}
            onChange={(e) => setDistrustIn(e.target.value)}
          />
          <button
            type="button"
            className={btn}
            onClick={() => {
              const extra: Record<string, number> = {};
              if (trustIn !== '') extra.trust = Number(trustIn);
              if (distrustIn !== '') extra.distrust = Number(distrustIn);
              void post('set', extra);
            }}
          >
            Set tally by hand
          </button>
        </div>
        {status && <p className="font-mono text-neutral-400">{status}</p>}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-neutral-300">Evidence</h2>
        {evidence ? (
          <p className="text-lg">
            {evidence.exhibits.length} exhibits
            {evidence.agentId ? ` · agent #${evidence.agentId}` : ' · no agentId yet'} · run {evidence.runId}
            <br />
            <span className="text-neutral-400">
              {Object.entries(counts)
                .map(([act, n]) => `${act} ${n}`)
                .join(' · ')}
            </span>
          </p>
        ) : (
          <p className="text-neutral-500">No evidence posted for this round.</p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-neutral-300">Closing statements</h2>
        <button type="button" className={`${btn} self-start`} disabled={generating} onClick={() => void generate()}>
          {generating ? 'Generating…' : 'Generate prosecutor + defense'}
        </button>
        {(['prosecutor', 'defense'] as const).map((r) => (
          <article key={r} className="rounded-xl border border-neutral-800 p-4">
            <p className="text-sm uppercase tracking-widest text-neutral-500">{r}</p>
            <p className="mt-2 whitespace-pre-wrap text-xl leading-relaxed">
              {statements[r] ? <Cited text={statements[r]} round={round} /> : <span className="text-neutral-600">—</span>}
            </p>
          </article>
        ))}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold text-neutral-300">Links</h2>
        <ul className="font-mono text-lg">
          {links.map((p) => (
            <li key={p}>
              <a className="text-sky-300 underline" href={p} target="_blank" rel="noreferrer">
                {baseUrl}
                {p}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function countByAct(evidence: Evidence | null): Record<string, number> {
  const out: Record<string, number> = {};
  for (const ex of evidence?.exhibits ?? []) out[ex.act] = (out[ex.act] ?? 0) + 1;
  return out;
}
