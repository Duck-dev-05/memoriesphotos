import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const album = await prisma.album.findUnique({
      where: { id },
      include: {
        user: { select: { name: true } },
        photos: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            url: true,
            altText: true,
            fileSize: true,
            createdAt: true,
          }
        }
      }
    });

    if (!album) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    const totalSize = album.photos.reduce((acc, p) => acc + (p.fileSize || 0), 0);

    return NextResponse.json({
      id: album.id,
      name: album.name,
      creator: album.user?.name || "Unknown",
      createdAt: album.createdAt.toISOString(),
      isPublic: album.isPublic,
      coverImage: album.coverImage,
      photoCount: album.photos.length,
      totalSizeBytes: totalSize,
      photos: album.photos
    });
  } catch (error) {
    console.error("Error in admin album details API:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
