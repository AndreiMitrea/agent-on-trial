export function RedisNotice() {
  return (
    <div className="rounded-lg border border-amber-500/50 bg-amber-950/40 px-5 py-4 text-left text-lg text-amber-200">
      <p className="font-semibold">Redis is not configured.</p>
      <p className="text-amber-200/80">
        Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN. Until then the live log, evidence and vote stay empty.
      </p>
    </div>
  );
}
