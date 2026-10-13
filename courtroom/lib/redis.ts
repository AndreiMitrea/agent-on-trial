import { Redis } from '@upstash/redis';

let client: Redis | null = null;

export class RedisMissing extends Error {
  constructor() {
    super('redis not configured');
    this.name = 'RedisMissing';
  }
}

export function redisConfigured(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

/** Null when the Upstash env is missing. Pages use this to render a notice. */
export function getRedis(): Redis | null {
  if (!redisConfigured()) return null;
  if (!client) client = Redis.fromEnv();
  return client;
}

/** Throws RedisMissing, which the route wrapper turns into a 500 JSON error. */
export function requireRedis(): Redis {
  const r = getRedis();
  if (!r) throw new RedisMissing();
  return r;
}
