import { prisma } from "./lib/prisma";

async function main() {
  const albums = await prisma.album.findMany({
    where: { name: { contains: "Trung Thu" } },
    include: {
      photos: true,
      children: {
        include: {
          photos: true,
          children: {
            include: { photos: true }
          }
        }
      }
    }
  });

  console.log(JSON.stringify(albums, null, 2));
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
