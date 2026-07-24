import { NextResponse } from "next/server";
import { checkApiAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limiter";

export async function GET(request: Request) {
  try {
    const session = await checkApiAuth(request);

    const rateLimit = await checkRateLimit(`api:photos:${session.userId}`, 60, 60);
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const url = new URL(request.url);
    const albumId = url.searchParams.get("albumId");
    const passcode = url.searchParams.get("passcode") || request.headers.get("X-Album-Passcode");

    if (albumId) {
      const album = await prisma.album.findUnique({ where: { id: albumId, userId: session.userId } });
      if (!album) return NextResponse.json({ error: "Album not found" }, { status: 404 });
      if (album.isLocked) {
        if (album.lockPasscode && album.lockPasscode !== passcode) {
          return NextResponse.json({ error: "Incorrect passcode" }, { status: 403 });
        }
      }
      
      const albumPhotos = await prisma.photo.findMany({
        where: { userId: session.userId, albumId: albumId, deletedAt: null },
        orderBy: [{ dateTaken: "desc" }, { createdAt: "desc" }],
        include: { album: true, tags: true }
      });
      return NextResponse.json({ photos: albumPhotos });
    }

    // Timeline view: Exclude photos from locked albums OR photos with no album (if any, though usually we want all non-locked)
    // Actually, we want to include photos with NO album, and photos in UNLOCKED albums.
    const timeline = await prisma.photo.findMany({
      where: { 
        userId: session.userId, 
        deletedAt: null,
        OR: [
          { albumId: null },
          { album: { isLocked: false } }
        ]
      },
      orderBy: [
        { dateTaken: "desc" },
        { createdAt: "desc" }
      ],
      include: { album: true, tags: true }
    });

    return NextResponse.json({ photos: timeline });
  } catch (error: any) {
    console.error("Photos API error:", error);
    return NextResponse.json({ error: error.message || "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await checkApiAuth(request);
    const body = await request.json();
    const { photoIds, targetAlbumId, albumId } = body;

    const ids = photoIds || (body.photoId ? [body.photoId] : []);
    const destAlbumId = targetAlbumId !== undefined ? targetAlbumId : albumId;

    if (!ids || ids.length === 0) {
      return NextResponse.json({ error: "No photoIds specified" }, { status: 400 });
    }

    const cleanTargetId = (destAlbumId && String(destAlbumId).trim()) ? String(destAlbumId).trim() : null;

    if (cleanTargetId) {
      const album = await prisma.album.findUnique({ where: { id: cleanTargetId } });
      if (!album || album.userId !== session.userId) {
        return NextResponse.json({ error: "Target album not found or unauthorized" }, { status: 404 });
      }
    }

    await prisma.photo.updateMany({
      where: {
        id: { in: ids },
        userId: session.userId,
      },
      data: {
        albumId: cleanTargetId,
      },
    });

    await clearUserCache(session.userId);
    return NextResponse.json({ success: true, count: ids.length });
  } catch (error: any) {
    console.error("PUT Photos API error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return PUT(request);
}
