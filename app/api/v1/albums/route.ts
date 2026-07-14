import { NextResponse } from "next/server";
import { checkApiAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await checkApiAuth(request);

    const albums = await prisma.album.findMany({
      where: { userId: session.userId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { photos: true }
        }
      }
    });

    return NextResponse.json({ albums });
  } catch (error: any) {
    console.error("Albums API error:", error);
    return NextResponse.json({ error: error.message || "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await checkApiAuth(request);
    const body = await request.json();
    const { name, description, isPublic, isCollaborative, coverImage } = body;

    if (!name) {
      return NextResponse.json({ error: "Album name is required" }, { status: 400 });
    }

    const album = await prisma.album.create({
      data: {
        name,
        description,
        isPublic: isPublic || false,
        isCollaborative: isCollaborative || false,
        coverImage: coverImage || null,
        userId: session.userId
      }
    });

    return NextResponse.json({ album }, { status: 201 });
  } catch (error: any) {
    console.error("Create Album API error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
