import "dotenv/config";
import { prisma } from './lib/prisma';

async function test() {
  try {
    console.log("DB URL:", process.env.DATABASE_URL);
    const user = await prisma.user.findFirst();
    console.log("Success! Users found or empty:", user);
  } catch (e) {
    console.error("Failed to connect to DB:", e);
  }
}

test();
