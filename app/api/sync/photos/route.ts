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
      targetUser = await prisma.user.findFirst();
    }
    
    const photos = await prisma.photo.findMany({
      where: { userId: targetUser?.id },
      select: {
        id: true,
        url: true,
        altText: true,
        description: true,
        dateTaken: true,
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

    for (const item of data) {
      if (!item.altText && !item.url) continue;

      let photo;
      try {
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
              userId: defaultUserId,
              createdAt: new Date(),
            }
          });
        }
        
        results.push({
          localId: item.localId,
          remoteId: photo.id
        });
      } catch (err) {
        console.error(`Failed to process photo ${item.altText}:`, err);
      }
    }

    await invalidatePattern("user:*:albums");
    await invalidatePattern("user:*:album:*");
    await invalidatePattern("user:*:totalPhotos");
    
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
