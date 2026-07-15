import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { invalidatePattern } from "@/lib/redis";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const userEmail = request.headers.get("x-user-email");
    let targetUser = null;
    if (userEmail) {
      targetUser = await prisma.user.findUnique({ where: { email: userEmail } });
    }
    if (!targetUser) {
      return NextResponse.json({ error: "Unauthorized: Invalid or missing user email" }, { status: 401 });
    }
    
    const photos = await prisma.photo.findMany({
      where: { userId: targetUser?.id },
      select: {
        id: true,
        url: true,
        altText: true,
        description: true,
        dateTaken: true,
        createdAt: true,
        locationName: true,
        albumId: true,
        cameraMake: true,
        cameraModel: true,
        lensModel: true,
        focalLength: true,
        fNumber: true,
        iso: true,
        exposureTime: true,
        fileSize: true,
        width: true,
        height: true,
        latitude: true,
        longitude: true,
      },
    });
    return NextResponse.json(photos);
  } catch (error) {
    console.error("Error fetching photos for sync:", error);
    return NextResponse.json({ error: "Failed to fetch photos" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    if (!Array.isArray(data)) {
      return NextResponse.json({ error: "Invalid data format, expected array" }, { status: 400 });
    }

    const results = [];
    
    // Find the user to assign the photos to
    const userEmail = request.headers.get("x-user-email");
    let targetUser = null;
    if (userEmail) {
      targetUser = await prisma.user.findUnique({ where: { email: userEmail } });
    }
    if (!targetUser) {
      targetUser = await prisma.user.findFirst();
    }
    const defaultUserId = targetUser?.id;

    // Hoist dynamic imports out of the loop
    let fs, path, exifr;
    const hasUploads = data.some(item => item.url && item.url.startsWith('/uploads/'));
    if (hasUploads) {
      fs = await import('fs/promises');
      path = await import('path');
      exifr = (await import('exifr')).default;
    }

    // Process in chunks to avoid overwhelming the database/system
    const CHUNK_SIZE = 10;
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      const chunk = data.slice(i, i + CHUNK_SIZE);
      
      const chunkPromises = chunk.map(async (item) => {
        if (!item.altText && !item.url) return null;

        let photo;
        try {
          if (item.url && item.url.startsWith('/uploads/')) {
            try {
              const fullPath = path.join(process.cwd(), 'public', item.url);
              
              // Check if file exists
              await fs.access(fullPath);
              
              // Read file and parse EXIF
              const buffer = await fs.readFile(fullPath);
              const exifData = await exifr.parse(buffer, {
                tiff: true, exif: true, gps: true, reviveValues: true,
              });

              if (exifData) {
                if (!item.dateTaken && exifData.DateTimeOriginal) {
                  item.dateTaken = new Date(exifData.DateTimeOriginal);
                } else if (!item.dateTaken && exifData.CreateDate) {
                  item.dateTaken = new Date(exifData.CreateDate);
                }
                
                if (!item.cameraMake) item.cameraMake = (exifData.Make || exifData.make) ? String(exifData.Make || exifData.make).trim() : null;
                if (!item.cameraModel) item.cameraModel = (exifData.Model || exifData.model) ? String(exifData.Model || exifData.model).trim() : null;
                if (!item.lensModel) item.lensModel = (exifData.LensModel || exifData.Lens || exifData.lens) ? String(exifData.LensModel || exifData.Lens || exifData.lens).trim() : null;
                if (!item.focalLength) item.focalLength = (exifData.FocalLength || exifData.focalLength) ? Number(exifData.FocalLength || exifData.focalLength) : null;
                if (!item.fNumber) item.fNumber = (exifData.FNumber || exifData.fNumber || exifData.ApertureValue) ? Number(exifData.FNumber || exifData.fNumber || exifData.ApertureValue) : null;
                if (!item.iso) item.iso = (exifData.ISO || exifData.iso) ? Number(exifData.ISO || exifData.iso) : null;
                
                if (!item.exposureTime) {
                  const et = exifData.ExposureTime || exifData.exposureTime;
                  if (et) {
                    item.exposureTime = et < 1 ? `1/${Math.round(1 / et)}` : String(et);
                  }
                }
                if (!item.width) item.width = (exifData.ImageWidth || exifData.ExifImageWidth) ? Number(exifData.ImageWidth || exifData.ExifImageWidth) : null;
                if (!item.height) item.height = (exifData.ImageHeight || exifData.ExifImageHeight) ? Number(exifData.ImageHeight || exifData.ExifImageHeight) : null;
                if (!item.latitude && exifData.latitude) item.latitude = exifData.latitude;
                if (!item.longitude && exifData.longitude) item.longitude = exifData.longitude;
              }
            } catch (exifErr) {
              console.error(`Failed to parse EXIF for ${item.url}:`, exifErr);
            }
          }

          if (item.remoteId) {
            photo = await prisma.photo.update({
              where: { id: item.remoteId },
              data: {
                url: item.url,
                altText: item.altText || "Unknown Photo",
                description: item.description,
                dateTaken: item.dateTaken ? new Date(item.dateTaken) : null,
                locationName: item.locationName,
                albumId: item.albumId,
                cameraMake: item.cameraMake,
                cameraModel: item.cameraModel,
                lensModel: item.lensModel,
                focalLength: item.focalLength,
                fNumber: item.fNumber,
                iso: item.iso,
                exposureTime: item.exposureTime,
                fileSize: item.fileSize,
                width: item.width,
                height: item.height,
                latitude: item.latitude,
                longitude: item.longitude,
              }
            });
          } else {
            photo = await prisma.photo.create({
              data: {
                url: item.url,
                altText: item.altText || "Unknown Photo",
                description: item.description,
                dateTaken: item.dateTaken ? new Date(item.dateTaken) : new Date(),
                locationName: item.locationName,
                albumId: item.albumId,
                cameraMake: item.cameraMake,
                cameraModel: item.cameraModel,
                lensModel: item.lensModel,
                focalLength: item.focalLength,
                fNumber: item.fNumber,
                iso: item.iso,
                exposureTime: item.exposureTime,
                fileSize: item.fileSize,
                width: item.width,
                height: item.height,
                latitude: item.latitude,
                longitude: item.longitude,
                userId: defaultUserId,
                createdAt: new Date(),
              }
            });
          }
          
          return {
            localId: item.localId,
            remoteId: photo.id
          };
        } catch (err) {
          console.error(`Failed to process photo ${item.altText}:`, err);
          return null;
        }
      });
      
      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults.filter(Boolean));
    }

    await invalidatePattern("user:*:*");
    
    revalidatePath("/");
    revalidatePath("/memories");
    revalidatePath("/albums");
    revalidatePath("/albums", "layout");
    
    return NextResponse.json(results);
  } catch (error) {
    console.error("Error syncing photos (POST):", error);
    return NextResponse.json({ error: "Failed to sync photos" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const data = await request.json();
    if (!Array.isArray(data)) {
      return NextResponse.json({ error: "Invalid data format, expected array of ids" }, { status: 400 });
    }

    await prisma.photo.deleteMany({
      where: { id: { in: data } }
    });

    await invalidatePattern("user:*:*");
    
    revalidatePath("/");
    revalidatePath("/memories");
    revalidatePath("/albums");
    revalidatePath("/albums", "layout");
    
    return NextResponse.json({ success: true, deletedCount: data.length });
  } catch (error) {
    console.error("Error deleting photos for sync:", error);
    return NextResponse.json({ error: "Failed to delete photos" }, { status: 500 });
  }
}
