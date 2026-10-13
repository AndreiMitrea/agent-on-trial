import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { handle } from '@/lib/http';
import { K, RoundId } from '@/lib/keys';
import { requireRedis } from '@/lib/redis';
import { getTally } from '@/lib/store';

export const dynamic = 'force-dynamic';

const VOTER_COOKIE = 'voter';
const VotePost = z.object({ round: RoundId, choice: z.enum(['trust', 'distrust']) });

export async function POST(req: NextRequest) {
  return handle(async () => {
    const { round, choice } = VotePost.parse(await req.json());
    const r = requireRedis();

    const existing = req.cookies.get(VOTER_COOKIE)?.value;
    const voter = existing && /^[0-9a-f-]{36}$/.test(existing) ? existing : crypto.randomUUID();
    const withCookie = (res: NextResponse) => {
      res.cookies.set(VOTER_COOKIE, voter, {
        maxAge: 24 * 60 * 60,
        sameSite: 'lax',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      });
      return res;
    };

    const open = await r.get<string | number>(K.voteOpen(round));
    if (String(open) !== '1') return withCookie(NextResponse.json({ error: 'vote closed' }, { status: 409 }));

    const added = await r.sadd(K.voters(round), voter);
    if (added === 0) return withCookie(NextResponse.json({ error: 'already voted' }, { status: 409 }));

    await r.hincrby(K.tally(round), choice, 1);
    return withCookie(NextResponse.json(await getTally(round)));
  });
}
