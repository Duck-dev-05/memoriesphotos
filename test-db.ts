import { prisma } from './lib/prisma';

async function main() {
  const albums = await prisma.album.findMany();
  console.log('Albums:', albums);
}

main().catch(console.error);
