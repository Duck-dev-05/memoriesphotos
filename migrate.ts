import { prisma } from './lib/prisma';

async function main() {
  const fromAlbum = await prisma.album.findFirst({
    where: { name: 'Trung thu 2017' } // Notice the case from the screenshot! "Trung thu 2017"
  });
  const toAlbum = await prisma.album.findFirst({
    where: { name: 'Trung Thu Khu Nhà Trường' } // Notice the case from the screenshot!
  });

  if (!fromAlbum || !toAlbum) {
    console.error('Albums not found:', { fromAlbum, toAlbum });
    return;
  }

  const result = await prisma.photo.updateMany({
    where: { albumId: fromAlbum.id },
    data: { albumId: toAlbum.id }
  });
  
  console.log(`Updated ${result.count} photos`);

  await prisma.album.delete({
    where: { id: fromAlbum.id }
  });

  console.log('Migration complete');
}

main().catch(console.error).finally(() => prisma.$disconnect());
