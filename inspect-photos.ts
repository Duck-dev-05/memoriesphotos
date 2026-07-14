import { prisma } from './lib/prisma';

async function main() {
  const photos = await prisma.photo.findMany();
  console.log(photos.map(p => ({
    id: p.id,
    url: p.url?.substring(0, 50),
    imageData: p.imageData ? 'present (length: ' + p.imageData.length + ')' : 'none',
    fileSize: p.fileSize
  })));
}

main().finally(() => prisma.$disconnect());
