import Link from 'next/link';

const CITE = /(\[[ABCDV]\d+\])/g;

/** Renders [A1]-style citations as links to the exhibit page. */
export function Cited({ text, round }: { text: string; round: string }) {
  const parts = text.split(CITE);
  return (
    <>
      {parts.map((part, i) => {
        const m = /^\[([ABCDV]\d+)\]$/.exec(part);
        if (!m) return <span key={i}>{part}</span>;
        return (
          <Link
            key={i}
            href={`/exhibit/${m[1]}?round=${encodeURIComponent(round)}`}
            target="_blank"
            className="mx-0.5 rounded bg-neutral-800 px-1.5 font-mono text-sky-300 no-underline hover:bg-neutral-700"
          >
            {m[1]}
          </Link>
        );
      })}
    </>
  );
}
