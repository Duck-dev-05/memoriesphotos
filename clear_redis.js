const { Redis } = require("ioredis");

const redis = new Redis("redis://default:gQAAAAAAAbhYAAIgcDIxYTkwZjg3MDFmZTY0ZWRkYTc4ZDVjZGJhOWM2OTBjOA@honest-trout-112728.upstash.io:6379", {
  tls: { rejectUnauthorized: false }
});

async function run() {
  try {
    const keys = await redis.keys("user:*");
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log("Cleared keys:", keys);
    } else {
      console.log("No keys found");
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    redis.disconnect();
  }
}

run();
