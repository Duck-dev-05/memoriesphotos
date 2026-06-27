import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
