import { prisma } from './lib/prisma';
import exifr from 'exifr';

async function main() {
  console.log("Fetching all photos...");
  const photos = await prisma.photo.findMany({
    where: {
      deletedAt: null,
    }
  });

  console.log(`Found ${photos.length} photos. Processing...`);

  for (const photo of photos) {
    if (photo.url && !photo.url.match(/\.(mp4|webm|ogg|mov)$/i)) {
      try {
        console.log(`Processing photo ID: ${photo.id} (${photo.url})`);
        
        // Fetch the image buffer from the URL
        const response = await fetch(photo.url);
        if (!response.ok) {
          console.error(`  -> Failed to fetch image for photo ${photo.id}: ${response.statusText}`);
          continue;
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Parse EXIF
        const exifData = await exifr.parse(buffer, {
          tiff: true,
          exif: true,
          reviveValues: true,
        });

        if (exifData) {
          let dateTaken = photo.dateTaken;
          if (exifData.DateTimeOriginal) {
            dateTaken = new Date(exifData.DateTimeOriginal);
          } else if (exifData.CreateDate) {
            dateTaken = new Date(exifData.CreateDate);
          }

          const cameraMake = (exifData.Make || exifData.make) ? String(exifData.Make || exifData.make).trim() : null;
          const cameraModel = (exifData.Model || exifData.model) ? String(exifData.Model || exifData.model).trim() : null;
          const lensModel = (exifData.LensModel || exifData.Lens || exifData.lens) ? String(exifData.LensModel || exifData.Lens || exifData.lens).trim() : null;
          const focalLength = (exifData.FocalLength || exifData.focalLength) ? Number(exifData.FocalLength || exifData.focalLength) : null;
          const fNumber = (exifData.FNumber || exifData.fNumber || exifData.ApertureValue) ? Number(exifData.FNumber || exifData.fNumber || exifData.ApertureValue) : null;
          const iso = (exifData.ISO || exifData.iso) ? Number(exifData.ISO || exifData.iso) : null;
          
          let exposureTime = null;
          const rawExposureTime = exifData.ExposureTime || exifData.exposureTime;
          if (rawExposureTime) {
            exposureTime = rawExposureTime < 1 ? `1/${Math.round(1 / rawExposureTime)}` : String(rawExposureTime);
          }

          // Update database
          await prisma.photo.update({
            where: { id: photo.id },
            data: {
              dateTaken,
              cameraMake,
              cameraModel,
              lensModel,
              focalLength,
              fNumber,
              iso,
              exposureTime,
            }
          });

          console.log(`  -> Updated EXIF: ${cameraMake || 'Unknown'} ${cameraModel || ''} | Lens: ${lensModel || 'None'}`);
        } else {
          console.log(`  -> No EXIF data found.`);
        }
      } catch (error) {
        console.error(`  -> Error processing photo ${photo.id}:`, error);
      }
    }
  }

  console.log("Done syncing EXIF data!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
