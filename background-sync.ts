import { prisma } from "./lib/prisma";
import { syncLocalPhotoToCloud } from "./app/actions/photo-sync";
import { evictLruCache } from "./app/actions/cache-eviction";

async function main() {
  console.log("Starting background sync cron job...");

  // Evict old LRU caches if disk is getting full
  await evictLruCache();

  // Find all photos with local URLs
  const pendingPhotos = await prisma.photo.findMany({
    where: {
      url: {
        startsWith: "/uploads/"
      }
    }
  });

  console.log(`Found ${pendingPhotos.length} photos requiring background cloud sync.`);

  for (const photo of pendingPhotos) {
    if (!photo.url) continue;
    console.log(`Syncing photo ${photo.id}...`);
    try {
      await syncLocalPhotoToCloud(photo.id, photo.url);
    } catch (e) {
      console.error(`Failed to sync photo ${photo.id}:`, e);
    }
  }

  console.log("Background sync job finished.");
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
