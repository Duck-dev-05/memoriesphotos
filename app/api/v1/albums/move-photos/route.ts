import { NextResponse } from "next/server";
import { checkApiAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clearUserCache } from "@/lib/redis";

export async function POST(request: Request) {
  try {
    const session = await checkApiAuth(request);
    const body = await request.json();
    const { photoIds, targetAlbumId } = body;

    if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
      return NextResponse.json({ error: "No photoIds provided" }, { status: 400 });
    }

    const cleanTargetId = (targetAlbumId && String(targetAlbumId).trim()) ? String(targetAlbumId).trim() : null;

    if (cleanTargetId) {
      const album = await prisma.album.findUnique({ where: { id: cleanTargetId } });
      if (!album || album.userId !== session.userId) {
        return NextResponse.json({ error: "Target album not found or unauthorized" }, { status: 404 });
      }
    }

    await prisma.photo.updateMany({
      where: {
        id: { in: photoIds },
        userId: session.userId,
      },
      data: {
        albumId: cleanTargetId,
      },
    });

    await clearUserCache(session.userId);
    return NextResponse.json({ success: true, count: photoIds.length });
  } catch (error: any) {
    console.error("Move photos API error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
