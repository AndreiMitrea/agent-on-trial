import { celoscanTx } from '@trial/shared';
import { bzzUrl } from '@/lib/links';

const PATTERN = /(0x[0-9a-fA-F]{64}|bzz:\/\/[0-9a-fA-F]{64})/g;

/** Turns tx hashes and bzz refs inside free text into links. */
export function Linkify({ text, gateway }: { text: string; gateway: string }) {
  const parts = text.split(PATTERN);
  return (
    <>
      {parts.map((part, i) => {
        if (/^0x[0-9a-fA-F]{64}$/.test(part)) {
          return (
            <a key={i} href={celoscanTx(part)} target="_blank" rel="noreferrer" className="underline text-sky-300 break-all">
              {part}
            </a>
          );
        }
        if (part.startsWith('bzz://')) {
          return (
            <a
              key={i}
              href={bzzUrl(part.slice('bzz://'.length), gateway)}
              target="_blank"
              rel="noreferrer"
              className="underline text-violet-300 break-all"
            >
              {part}
            </a>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
