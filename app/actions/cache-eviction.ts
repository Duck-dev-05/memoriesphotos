import { prisma } from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";

// Evict photos if free disk space is less than 2 GB
const MIN_FREE_SPACE_BYTES = 2 * 1024 * 1024 * 1024;
// Stop evicting when we reach 3 GB free (buffer)
const TARGET_FREE_SPACE_BYTES = 3 * 1024 * 1024 * 1024;

export async function evictLruCache() {
  const uploadDir = path.join(process.cwd(), "public", "uploads");

  try {
    let freeSpaceBytes = 0;
    
    if (typeof fs.statfs === 'function') {
      const stats = await fs.statfs(uploadDir);
      freeSpaceBytes = stats.bavail * stats.bsize;
    } else {
      console.warn("fs.statfs is not supported on this Node.js version. Skipping cache eviction based on free space.");
      return;
    }

    if (freeSpaceBytes >= MIN_FREE_SPACE_BYTES) {
      console.log(`Disk space is healthy. Free space: ${(freeSpaceBytes / 1024 / 1024 / 1024).toFixed(2)} GB`);
      return;
    }

    console.log(`Low disk space detected! Free space: ${(freeSpaceBytes / 1024 / 1024 / 1024).toFixed(2)} GB. Starting LRU cache eviction...`);

    // Find all photos with local cache AND a valid cloudUrl, sorted by oldest first
    const evictablePhotos = await prisma.photo.findMany({
      where: {
        url: { startsWith: "/uploads/" },
        // @ts-ignore - Ignore type error if prisma generate hasn't updated local types
        cloudUrl: { not: null }
      },
      orderBy: {
        createdAt: 'asc' // LRU / FIFO
      }
    });

    let evictedCount = 0;
    let recoveredBytes = 0;

    for (const photo of evictablePhotos) {
      if (freeSpaceBytes >= TARGET_FREE_SPACE_BYTES) {
        break;
      }

      if (!photo.url || !(photo as any).cloudUrl) continue;

      const filePath = path.join(process.cwd(), "public", photo.url);
      
      try {
        const fileStats = await fs.stat(filePath);
        const size = fileStats.size;

        // Delete the local file
        await fs.unlink(filePath);
        
        // Update database to point directly to cloud URL
        await prisma.photo.update({
          where: { id: photo.id },
          data: { url: (photo as any).cloudUrl }
        });

        freeSpaceBytes += size;
        recoveredBytes += size;
        evictedCount++;

        console.log(`Evicted local cache for photo ${photo.id}. Recovered ${(size / 1024 / 1024).toFixed(2)} MB`);
      } catch (err) {
        console.warn(`Failed to evict photo ${photo.id} (${filePath}):`, err);
      }
    }

    console.log(`Cache eviction finished. Evicted ${evictedCount} items, recovered ${(recoveredBytes / 1024 / 1024).toFixed(2)} MB.`);
  } catch (error) {
    console.error("Error during cache eviction:", error);
  }
}
