'use client';

import { useState } from 'react';
import { askStream, type AskRole } from '@/lib/ask-client';
import { Cited } from './Cited';

interface Exchange {
  role: AskRole;
  question: string;
  answer: string;
  error?: string;
}

const KEEP = 5;

export function CrossClient({ round }: { round: string }) {
  const [role, setRole] = useState<AskRole>('defendant');
  const [question, setQuestion] = useState('');
  const [items, setItems] = useState<Exchange[]>([]);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    const q = question.trim();
    const entry: Exchange = { role, question: q || '(closing statement)', answer: '' };
    setItems((prev) => [entry, ...prev].slice(0, KEEP));
    setBusy(true);
    setQuestion('');
    const update = (patch: Partial<Exchange>) =>
      setItems((prev) => prev.map((it) => (it === entry ? Object.assign(entry, patch) : it)).slice());
    try {
      await askStream({ round, role, question: q || undefined }, (text) => update({ answer: text }));
    } catch (e) {
      update({ error: e instanceof Error ? e.message : 'failed' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-6 py-10">
      <header className="flex items-baseline justify-between">
        <h1 className="text-4xl font-bold">Cross-examination</h1>
        <span className="font-mono text-neutral-400">round {round}</span>
      </header>

      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="flex gap-3">
          {(['defendant', 'prosecutor', 'defense'] as AskRole[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`rounded-lg border px-4 py-2 text-lg capitalize ${
                role === r ? 'border-neutral-100 bg-neutral-100 text-neutral-950' : 'border-neutral-700'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={3}
          placeholder={role === 'defendant' ? 'Ask the defendant.' : 'Optional. Leave empty for the closing statement.'}
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 text-xl"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void submit();
          }}
        />
        <button
          type="submit"
          disabled={busy}
          className="self-start rounded-lg bg-neutral-100 px-6 py-3 text-xl font-semibold text-neutral-950 disabled:opacity-50"
        >
          {busy ? 'Answering…' : 'Ask'}
        </button>
      </form>

      <section className="flex flex-col gap-6">
        {items.map((it, i) => (
          <article key={i} className="rounded-xl border border-neutral-800 p-5">
            <p className="text-sm uppercase tracking-widest text-neutral-500">{it.role}</p>
            <p className="mt-1 text-lg text-neutral-300">{it.question}</p>
            <p className="mt-4 whitespace-pre-wrap text-2xl leading-relaxed">
              {it.answer ? <Cited text={it.answer} round={round} /> : it.error ? '' : '…'}
            </p>
            {it.error && <p className="mt-2 text-rose-400">{it.error}</p>}
          </article>
        ))}
      </section>
    </main>
  );
}
