import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import exifr from "exifr";

export async function GET(request: Request) {
  // Optional: check for cron secret
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Find photos that might be missing EXIF data (e.g. missing dateTaken or cameraMake)
    // We exclude videos since EXIF is mainly for photos.
    const photosToProcess = await prisma.photo.findMany({
      where: {
        deletedAt: null,
        NOT: {
          url: {
            endsWith: ".mp4"
          }
        },
        OR: [
          { dateTaken: null },
          { cameraMake: null }
        ]
      },
      take: 20, // Process max 20 per run to prevent timeout/high bandwidth usage
      orderBy: { createdAt: "desc" }
    });

    if (photosToProcess.length === 0) {
      return NextResponse.json({ message: "No photos need EXIF cleanup.", count: 0 });
    }

    const results = [];

    for (const photo of photosToProcess) {
      if (!photo.url) {
        results.push({ id: photo.id, status: "skipped - no url" });
        continue;
      }

      try {
        // exifr.parse can take a URL and uses Range requests to fetch only what's needed!
        const exifData = await exifr.parse(photo.url, {
          tiff: true,
          exif: true,
          gps: true,
          reviveValues: true,
        });

        if (exifData) {
          let dateTaken = photo.dateTaken;
          
          if (!dateTaken) {
            if (exifData.DateTimeOriginal) {
              dateTaken = new Date(exifData.DateTimeOriginal);
            } else if (exifData.CreateDate) {
              dateTaken = new Date(exifData.CreateDate);
            }
          }

          await prisma.photo.update({
            where: { id: photo.id },
            data: {
              dateTaken: dateTaken,
              cameraMake: exifData.Make || photo.cameraMake,
              cameraModel: exifData.Model || photo.cameraModel,
              lensModel: exifData.LensModel || photo.lensModel,
              fNumber: exifData.FNumber ? Number(exifData.FNumber) : photo.fNumber,
              exposureTime: exifData.ExposureTime ? String(exifData.ExposureTime) : photo.exposureTime,
              iso: exifData.ISO ? Number(exifData.ISO) : photo.iso,
              focalLength: exifData.FocalLength ? Number(exifData.FocalLength) : photo.focalLength,
            }
          });
          results.push({ id: photo.id, status: "success", exifFound: true });
        } else {
          // If no EXIF is found, we might want to flag it so we don't keep retrying it forever.
          // For now, we update a placeholder or we just leave it. 
          // To prevent infinite retry loop, let's set cameraMake to "Unknown" if it's null.
          await prisma.photo.update({
            where: { id: photo.id },
            data: {
              cameraMake: photo.cameraMake || "Unknown",
            }
          });
          results.push({ id: photo.id, status: "success", exifFound: false, flagged: true });
        }
      } catch (err: any) {
        console.error(`Error parsing EXIF for photo ${photo.id}:`, err);
        // Flag to avoid infinite loops on unparseable files
        await prisma.photo.update({
          where: { id: photo.id },
          data: {
            cameraMake: photo.cameraMake || "Unknown",
          }
        });
        results.push({ id: photo.id, status: "error", error: err.message, flagged: true });
      }
    }

    return NextResponse.json({
      message: "EXIF cleanup completed successfully.",
      processedCount: photosToProcess.length,
      results
    });
  } catch (error: any) {
    console.error("Cron EXIF cleanup error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
