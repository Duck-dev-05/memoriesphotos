import { NextResponse } from "next/server";
import { checkApiAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await checkApiAuth(request);

    // Albums I have shared via link
    const albumsISharedViaLink = await prisma.album.findMany({
      where: {
        userId: session.userId,
        deletedAt: null,
        shareToken: { not: null }
      },
      include: {
        _count: { select: { photos: { where: { deletedAt: null } } } }
      },
      orderBy: { createdAt: "desc" }
    });

    // Albums shared with me via email
    const sharesWithMe = await prisma.albumShare.findMany({
      where: { userId: session.userId },
      include: {
        album: {
          include: {
            _count: { select: { photos: { where: { deletedAt: null } } } }
          }
        }
      }
    });

    const albumsSharedWithMe = sharesWithMe.map(share => ({
      ...share.album,
      myRole: share.role // Include my role in the response
    }));

    // Albums I have shared via email (but might not have a public link)
    const albumsISharedViaEmail = await prisma.album.findMany({
      where: {
        userId: session.userId,
        deletedAt: null,
        albumShares: { some: {} },
        shareToken: null // Avoid duplicates with link-shared albums
      },
      include: {
        _count: { select: { photos: { where: { deletedAt: null } } } }
      },
      orderBy: { createdAt: "desc" }
    });

    const allSharedAlbums = [...albumsISharedViaLink, ...albumsISharedViaEmail, ...albumsSharedWithMe];

    return NextResponse.json({ albums: allSharedAlbums });
  } catch (error: any) {
    console.error("Shared API error:", error);
    return NextResponse.json({ error: error.message || "Unauthorized" }, { status: 401 });
  }
}
