import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  try {
    const dbAlbums = await prisma.album.findMany({
      include: {
        _count: { select: { photos: true } },
        user: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const albums = dbAlbums.map(a => ({
      id: a.id,
      name: a.name,
      creator: a.user?.name || "Unknown",
      photoCount: a._count.photos,
      featured: false, // We don't have a featured flag in schema
      privacy: a.isPublic ? "Public" : "Private",
      cover: a.coverImage || null,
      createdAt: a.createdAt.toISOString()
    }));

    return NextResponse.json({ albums });
  } catch (error) {
    console.error("Error in admin albums API:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
