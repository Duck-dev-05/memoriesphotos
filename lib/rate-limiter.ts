import { redis } from "./redis";

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

/**
 * Basic Redis rate limiter based on sliding window / counter.
 * If Redis is not connected, fails open (returns success: true).
 */
export async function checkRateLimit(
  identifier: string,
  limit: number = 30,
  windowSeconds: number = 60
): Promise<RateLimitResult> {
  if (!redis) {
    return { success: true, limit, remaining: limit, resetSeconds: 0 };
  }

  const key = `ratelimit:${identifier}`;

  try {
    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, windowSeconds);
    }

    const ttl = await redis.ttl(key);
    const remaining = Math.max(0, limit - current);

    return {
      success: current <= limit,
      limit,
      remaining,
      resetSeconds: ttl > 0 ? ttl : windowSeconds,
    };
  } catch (err) {
    console.error(`Rate limiter error for ${identifier}:`, err);
    return { success: true, limit, remaining: limit, resetSeconds: 0 };
  }
}
