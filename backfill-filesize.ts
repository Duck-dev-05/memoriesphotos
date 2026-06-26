import { prisma } from './lib/prisma';

async function main() {
  console.log("Backfilling missing file sizes for existing photos...");
  const photos = await prisma.photo.findMany();

  if (photos.length === 0) {
    console.log("No photos missing file size. Database is already fixed!");
    return;
  }

  console.log(`Found ${photos.length} photos missing fileSize. Updating...`);

  let totalAddedBytes = 0;
  for (const photo of photos) {
    let actualSize = 0;

    if (photo.url) {
      try {
        const response = await fetch(photo.url, { method: 'HEAD' });
        if (response.ok) {
          const contentLength = response.headers.get('content-length');
          if (contentLength) {
            actualSize = parseInt(contentLength, 10);
          }
        }
      } catch (err: any) {
        console.error(`Failed to fetch HEAD for ${photo.url}`, err.message);
      }
    } else if (photo.imageData) {
      // Calculate size from base64 string
      const base64Str = photo.imageData.split(',')[1] || photo.imageData;
      const padding = (base64Str.match(/=/g) || []).length;
      actualSize = Math.floor((base64Str.length * 3) / 4) - padding;
    }

    if (actualSize > 0) {
      totalAddedBytes += actualSize;
      await prisma.photo.update({
        where: { id: photo.id },
        data: { fileSize: actualSize }
      });
      console.log(`Updated photo ${photo.id} with size ${actualSize} bytes.`);
    } else {
      console.log(`Could not determine size for photo ${photo.id}`);
    }
  }

  const gb = (totalAddedBytes / (1024 * 1024 * 1024)).toFixed(2);
  console.log(`Successfully backfilled sizes for ${photos.length} photos. Added roughly ${gb} GB of storage usage.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
