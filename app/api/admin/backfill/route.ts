import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const photos = await prisma.photo.findMany({
      where: {
        fileSize: null
      }
    });

    if (photos.length === 0) {
      return NextResponse.json({ message: "No photos missing file size. Database is already fixed!" });
    }

    let totalAddedBytes = 0;
    let updatedCount = 0;

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
        updatedCount++;
      }
    }

    const gb = (totalAddedBytes / (1024 * 1024 * 1024)).toFixed(2);
    return NextResponse.json({
      message: `Successfully backfilled sizes for ${updatedCount} photos. Added roughly ${gb} GB of storage usage.`,
      foundMissing: photos.length,
      updated: updatedCount
    });

  } catch (error: any) {
    console.error("Error in backfill API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
