import { Redis } from "ioredis";

const redisUrl = "redis://default:gQAAAAAAAbhYAAIgcDIxYTkwZjg3MDFmZTY0ZWRkYTc4ZDVjZGJhOWM2OTBjOA@honest-trout-112728.upstash.io:6379";
const redis = new Redis(redisUrl, { tls: { rejectUnauthorized: false } });

async function main() {
  await redis.flushall();
  console.log("Flushed remote Upstash redis cache");
}

main().finally(() => process.exit(0));
