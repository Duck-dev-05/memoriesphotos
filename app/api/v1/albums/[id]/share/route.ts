import { NextResponse } from "next/server";
import { checkApiAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clearUserCache } from "@/lib/redis";
import { v4 as uuidv4 } from "uuid";
import { revalidatePath } from "next/cache";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await checkApiAuth(request);
    const { id } = await params;

    const album = await prisma.album.findUnique({
      where: { id: id, userId: session.userId }
    });

    if (!album) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    if (album.shareToken) {
      return NextResponse.json({ album });
    }

    const token = uuidv4();
    const updatedAlbum = await prisma.album.update({
      where: { id: id, userId: session.userId },
      data: { isPublic: true, shareToken: token }
    });

    await clearUserCache(session.userId);
    revalidatePath("/shared-albums", "layout");

    return NextResponse.json({ album: updatedAlbum });
  } catch (error: any) {
    console.error("Share Album POST API error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await checkApiAuth(request);
    const { id } = await params;

    const updatedAlbum = await prisma.album.update({
      where: { id: id, userId: session.userId },
      data: { isPublic: false, shareToken: null, isCollaborative: false }
    });

    await clearUserCache(session.userId);
    revalidatePath("/shared-albums", "layout");

    return NextResponse.json({ album: updatedAlbum });
  } catch (error: any) {
    console.error("Share Album DELETE API error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
