import { Redis } from "ioredis";

const redisUrl = process.env.REDIS_URL || "";
const useRedis = !!redisUrl && redisUrl !== "redis://localhost:6379";

const isUpstash = redisUrl.includes("upstash.io");

// Ensure Redis doesn't hang Vercel functions indefinitely if disconnected
const redisOptions = {
  maxRetriesPerRequest: 1,
  connectTimeout: 2000, // Fail fast after 2 seconds
  retryStrategy: () => null, // Do not retry connecting automatically
  ...(isUpstash && !redisUrl.startsWith("rediss://") ? { tls: { rejectUnauthorized: false } } : {})
};

const globalForRedis = global as unknown as { redis: Redis | null };

export const redis = globalForRedis.redis || (useRedis ? new Redis(redisUrl, redisOptions) : null);

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;

const CACHE_TTL = 3600; // 1 hour by default

export async function getCache<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    const data = await redis.get(key);
    if (!data) return null;
    return JSON.parse(data, (key, value) => {
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(value)) {
        return new Date(value);
      }
      return value;
    }) as T;
  } catch (err) {
    console.error(`Error reading cache for key ${key}:`, err);
    return null;
  }
}

export async function setCache(key: string, data: any, ttl: number = CACHE_TTL) {
  if (!redis) return;
  try {
    await redis.set(key, JSON.stringify(data), "EX", ttl);
  } catch (err) {
    console.error(`Error setting cache for key ${key}:`, err);
  }
}

export async function delCache(key: string) {
  if (!redis) return;
  try {
    await redis.del(key);
  } catch (err) {
    console.error(`Error deleting cache for key ${key}:`, err);
  }
}

export async function invalidatePattern(pattern: string) {
  if (!redis) return;
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (err) {
    console.error(`Error invalidating pattern ${pattern}:`, err);
  }
}
