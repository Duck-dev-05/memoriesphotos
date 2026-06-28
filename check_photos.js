const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const photos = await prisma.photo.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' }
  });
  console.log(photos.map(p => ({ id: p.id, albumId: p.albumId, url: p.url })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
