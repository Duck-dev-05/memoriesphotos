import { prisma } from './lib/prisma';

async function main() {
  const albums = await prisma.album.findMany({
    include: {
      photos: {
        select: { fileSize: true }
      }
    }
  });

  for (const album of albums) {
    const totalSize = album.photos.reduce((acc, p) => acc + (p.fileSize || 0), 0);
    const gb = (totalSize / (1024 * 1024 * 1024)).toFixed(6);
    console.log(`Album: ${album.name} - ${gb} GB`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
