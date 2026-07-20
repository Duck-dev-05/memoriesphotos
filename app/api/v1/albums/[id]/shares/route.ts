import { NextResponse } from "next/server";
import { checkApiAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await checkApiAuth(request);

    const album = await prisma.album.findUnique({
      where: { id: params.id },
    });

    if (!album) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    // You can see shares if you own the album OR if you are in the shares
    const isOwner = album.userId === session.userId;
    
    let isSharedWithUser = false;
    if (!isOwner) {
      const myShare = await prisma.albumShare.findUnique({
        where: {
          albumId_userId: {
            albumId: params.id,
            userId: session.userId,
          }
        }
      });
      if (myShare) isSharedWithUser = true;
    }

    if (!isOwner && !isSharedWithUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shares = await prisma.albumShare.findMany({
      where: { albumId: params.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ shares });
  } catch (error: any) {
    console.error("Get shares API error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
