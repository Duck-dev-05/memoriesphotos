const { PrismaClient } = require('./app/generated/db');
const { PrismaLibSql } = require('@prisma/adapter-libsql');

const connectionString = process.env.DATABASE_URL || 'file:./dev.db';

const adapter = new PrismaLibSql({
  url: connectionString,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    const user = await prisma.user.findFirst();
    if (!user) return;
    
    const stories = await prisma.memoryStory.findMany({
      where: {
        userId: user.id,
        dayMonth: "01-01",
      },
    });
    console.log("Stories:", stories);
  } catch (e) {
    console.error("Error:", e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
