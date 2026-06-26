import { prisma } from "./lib/prisma";
async function main() {
  await prisma.tag.deleteMany({});
  console.log('Tags deleted');
}
main().catch(console.error).finally(() => prisma.$disconnect());
