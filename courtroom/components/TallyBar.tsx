'use client';

import { pctTrust, type VoteTally } from '@trial/shared';

export function TallyBar({ tally, size = 'md' }: { tally: VoteTally | null; size?: 'md' | 'lg' }) {
  const trust = tally?.trust ?? 0;
  const distrust = tally?.distrust ?? 0;
  const total = trust + distrust;
  const pct = tally ? pctTrust(tally) : 0;
  const text = size === 'lg' ? 'text-3xl' : 'text-lg';
  const bar = size === 'lg' ? 'h-8' : 'h-4';

  return (
    <div className="w-full" aria-label="vote tally">
      <div className={`flex items-baseline justify-between ${text} font-semibold`}>
        <span className="text-emerald-400">Trust {trust}</span>
        <span className="text-neutral-400">
          {tally ? (tally.open ? 'Vote open' : 'Vote closed') : 'No tally'}
          {total > 0 ? ` · ${pct}% trust · ${total} votes` : ' · no votes yet'}
        </span>
        <span className="text-rose-400">Don&apos;t trust {distrust}</span>
      </div>
      <div className={`mt-2 ${bar} w-full overflow-hidden rounded-full ${total ? 'bg-rose-600' : 'bg-neutral-800'}`}>
        <div className="h-full bg-emerald-500 transition-[width] duration-500" style={{ width: `${total ? pct : 0}%` }} />
      </div>
    </div>
  );
}
