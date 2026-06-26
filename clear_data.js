const { PrismaClient } = require('./app/generated/prisma');
const prisma = new PrismaClient();

async function main() {
  console.log("Deleting all photos...");
  await prisma.photo.deleteMany();
  console.log("Deleting all albums...");
  await prisma.album.deleteMany();
  console.log("All mock data removed.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
