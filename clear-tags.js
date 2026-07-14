const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.tag.deleteMany({});
  console.log('Tags deleted');
}
main().catch(console.error).finally(() => prisma.$disconnect());
