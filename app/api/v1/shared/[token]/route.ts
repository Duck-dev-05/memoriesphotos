import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const album = await prisma.album.findFirst({
      where: { 
        shareToken: token, 
        isPublic: true,
        deletedAt: null
      },
      include: {
        photos: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          include: { tags: true }
        },
        user: {
          select: { name: true }
        },
        _count: {
          select: { photos: { where: { deletedAt: null } } }
        }
      }
    });

    if (!album) {
      return NextResponse.json({ error: "Album not found or not public" }, { status: 404 });
    }

    return NextResponse.json({ album });
  } catch (error: any) {
    console.error("Shared Album Public API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
