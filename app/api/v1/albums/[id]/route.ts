import { NextResponse } from "next/server";
import { checkApiAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clearUserCache } from "@/lib/redis";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await checkApiAuth(request);
    const { id } = await params;

    await prisma.album.delete({
      where: {
        id: id,
        userId: session.userId
      }
    });

    await clearUserCache(session.userId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete Album API error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await checkApiAuth(request);
    const body = await request.json();
    const { name, description, isPublic, coverImage, isLocked, lockPasscode } = body;
    const { id } = await params;

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (isPublic !== undefined) data.isPublic = isPublic;
    if (coverImage !== undefined) data.coverImage = coverImage;
    if (isLocked !== undefined) data.isLocked = isLocked;
    if (lockPasscode !== undefined) data.lockPasscode = lockPasscode;

    const album = await prisma.album.update({
      where: { id: id, userId: session.userId },
      data
    });

    await clearUserCache(session.userId);

    return NextResponse.json({ album });
  } catch (error: any) {
    console.error("Update Album API error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
