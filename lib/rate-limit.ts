type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const globalForRateLimit = globalThis as typeof globalThis & {
  __tramDocRateLimit?: Map<string, Bucket>;
  __tramDocRateLimitSweep?: number;
};

const buckets = globalForRateLimit.__tramDocRateLimit ?? new Map<string, Bucket>();
globalForRateLimit.__tramDocRateLimit = buckets;

export function rateLimit({ key, limit, windowMs }: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    sweepExpiredBuckets(now);
    return { ok: true, remaining: Math.max(limit - 1, 0), retryAfterSeconds: 0 };
  }

  const retryAfterSeconds = Math.max(Math.ceil((existing.resetAt - now) / 1000), 1);
  if (existing.count >= limit) {
    return { ok: false, remaining: 0, retryAfterSeconds };
  }

  existing.count += 1;
  buckets.set(key, existing);

  return {
    ok: true,
    remaining: Math.max(limit - existing.count, 0),
    retryAfterSeconds: 0,
  };
}

function sweepExpiredBuckets(now: number) {
  const lastSweep = globalForRateLimit.__tramDocRateLimitSweep ?? 0;
  if (now - lastSweep < 60_000) return;

  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }

  globalForRateLimit.__tramDocRateLimitSweep = now;
}
