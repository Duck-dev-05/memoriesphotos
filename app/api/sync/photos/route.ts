import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const photos = await prisma.photo.findMany({
      select: {
        id: true,
        url: true,
        altText: true,
        description: true,
        dateTaken: true,
        locationName: true,
        albumId: true,
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

    revalidatePath("/");
    revalidatePath("/memories");
    revalidatePath("/albums");
    
    return NextResponse.json(results);
  } catch (error) {
    console.error("Error syncing photos (POST):", error);
    return NextResponse.json({ error: "Failed to sync photos" }, { status: 500 });
  }
}
