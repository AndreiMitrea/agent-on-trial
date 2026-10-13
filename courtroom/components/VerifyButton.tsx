'use client';

import { useState } from 'react';

interface VerifyResult {
  ok: boolean;
  computedHash?: string;
  expectedHash?: string;
  status?: string;
  note?: string;
  error?: string;
}

export function VerifyButton({ id, round }: { id: string; round: string }) {
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [busy, setBusy] = useState(false);

  async function verify() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch(`/api/verify/${encodeURIComponent(id)}?round=${encodeURIComponent(round)}`, { cache: 'no-store' });
      const body = (await res.json()) as VerifyResult;
      setResult(res.ok ? body : { ok: false, error: body.error ?? `HTTP ${res.status}` });
    } catch (e) {
      setResult({ ok: false, error: e instanceof Error ? e.message : 'failed' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => void verify()}
        disabled={busy}
        className="self-start rounded-lg bg-neutral-100 px-5 py-2 text-lg font-semibold text-neutral-950 disabled:opacity-50"
      >
        {busy ? 'Checking…' : 'Verify'}
      </button>
      {result && (
        <div
          className={`rounded-lg border p-4 ${
            result.ok ? 'border-emerald-500/60 bg-emerald-950/40 text-emerald-200' : 'border-rose-500/60 bg-rose-950/40 text-rose-200'
          }`}
        >
          <p className="text-xl font-semibold">{result.ok ? 'Verified' : 'Does not match'}</p>
          {result.note && <p>{result.note}</p>}
          {result.status && <p>receipt status: {result.status}</p>}
          {result.error && <p>{result.error}</p>}
          {result.computedHash && (
            <dl className="mt-2 font-mono text-sm break-all">
              <dt className="text-neutral-400">computed</dt>
              <dd>{result.computedHash}</dd>
              <dt className="mt-1 text-neutral-400">expected</dt>
              <dd>{result.expectedHash}</dd>
            </dl>
          )}
        </div>
      )}
    </div>
  );
}
