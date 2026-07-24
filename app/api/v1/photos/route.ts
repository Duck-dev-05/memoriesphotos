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
