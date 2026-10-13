'use client';

import { useEffect, useRef, useState } from 'react';
import type { LogLine, VoteTally } from '@trial/shared';
import { Linkify } from './Linkify';
import { TallyBar } from './TallyBar';
import { usePoll } from '@/lib/use-poll';

const POLL_MS = 2000;

function time(at: string): string {
  const d = new Date(at);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-GB', { hour12: false });
}

function compact(v: unknown): string {
  if (v === undefined) return '';
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  return s.length > 200 ? `${s.slice(0, 200)}…` : s;
}

function toolCallLabel(line: LogLine): string {
  const name = line.data?.name;
  if (typeof name === 'string') return `${name}(${compact(line.data?.args ?? line.data?.input)})`;
  return line.text;
}

function Line({ line, gateway }: { line: LogLine; gateway: string }) {
  const stamp = <span className="mr-3 shrink-0 font-mono text-sm text-neutral-600">{time(line.at)}</span>;
  switch (line.kind) {
    case 'host':
      return (
        <div className="flex">
          {stamp}
          <span className="text-xl font-bold">
            <Linkify text={line.text} gateway={gateway} />
          </span>
        </div>
      );
    case 'tool_call':
      return (
        <div className="flex">
          {stamp}
          <span className="font-mono text-base text-sky-300 break-all">→ {toolCallLabel(line)}</span>
        </div>
      );
    case 'tool_result':
      return (
        <div className="flex">
          {stamp}
          <span className="font-mono text-sm text-neutral-500 break-all">
            ← <Linkify text={line.text} gateway={gateway} />
          </span>
        </div>
      );
    case 'tx':
      return (
        <div className="flex">
          {stamp}
          <span className="text-lg text-emerald-300">
            <Linkify text={line.text} gateway={gateway} />
          </span>
        </div>
      );
    case 'warn':
      return (
        <div className="flex">
          {stamp}
          <span className="text-lg text-amber-300">{line.text}</span>
        </div>
      );
    case 'error':
      return (
        <div className="flex">
          {stamp}
          <span className="text-lg text-rose-400">{line.text}</span>
        </div>
      );
    case 'approve':
      return (
        <div className="flex">
          {stamp}
          <span className="text-lg text-violet-300">{line.text}</span>
        </div>
      );
    case 'info':
      return (
        <div className="flex">
          {stamp}
          <span className="text-base text-neutral-400">
            <Linkify text={line.text} gateway={gateway} />
          </span>
        </div>
      );
    default:
      return (
        <div className="flex">
          {stamp}
          <span className="text-lg text-neutral-200">
            <Linkify text={line.text} gateway={gateway} />
          </span>
        </div>
      );
  }
}

export function LiveClient({ round, gateway }: { round: string; gateway: string }) {
  const [lines, setLines] = useState<LogLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const nextRef = useRef(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const { data: tally } = usePoll<VoteTally>(`/api/vote/tally?round=${encodeURIComponent(round)}`, POLL_MS);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const res = await fetch(`/api/log?round=${encodeURIComponent(round)}&after=${nextRef.current}`, {
          cache: 'no-store',
        });
        const body = (await res.json()) as { lines?: LogLine[]; next?: number; error?: string };
        if (!alive) return;
        if (!res.ok) {
          setError(body.error ?? `HTTP ${res.status}`);
          return;
        }
        setError(null);
        if (body.lines && body.lines.length > 0) {
          nextRef.current = body.next ?? nextRef.current + body.lines.length;
          setLines((prev) => [...prev, ...(body.lines as LogLine[])]);
        }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'fetch failed');
      }
    };
    void tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [round]);

  // Follow the tail unless the reader scrolled up to look at something.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 240;
    if (nearBottom) el.scrollTop = el.scrollHeight;
  }, [lines.length]);

  return (
    <div className="flex h-screen flex-col">
      <header className="border-b border-neutral-800 px-6 py-4">
        <div className="flex items-baseline justify-between gap-6">
          <h1 className="text-2xl font-bold">Live transcript</h1>
          <span className="font-mono text-neutral-400">round {round}</span>
        </div>
        <div className="mt-3">
          <TallyBar tally={tally} />
        </div>
      </header>
      <div ref={boxRef} className="flex-1 space-y-2 overflow-y-auto px-6 py-4">
        {lines.length === 0 && !error && <p className="text-neutral-500">Waiting for the agent.</p>}
        {lines.map((line, i) => (
          <Line key={i} line={line} gateway={gateway} />
        ))}
        {error && <p className="text-rose-400">{error}</p>}
      </div>
    </div>
  );
}
