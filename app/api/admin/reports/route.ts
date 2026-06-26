import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  try {
    const [userCount, photoCount, albumCount, storyCount, tagCount, dbPhotos] = await Promise.all([
      prisma.user.count(),
      prisma.photo.count(),
      prisma.album.count(),
      prisma.story.count(),
      prisma.tag.count(),
      prisma.photo.findMany({ select: { fileSize: true } })
    ]);

    // Calculate total size in MB
    let totalSizeBytes = 0;
    for (const p of dbPhotos) {
      if (p.fileSize) totalSizeBytes += p.fileSize;
    }
    const totalSizeMB = (totalSizeBytes / (1024 * 1024)).toFixed(2);

    const reports: any[] = [];

    return NextResponse.json({ reports });
  } catch (error) {
    console.error("Error in admin reports API:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
