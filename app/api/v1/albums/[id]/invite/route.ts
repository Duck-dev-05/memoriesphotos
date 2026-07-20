import { NextResponse } from "next/server";
import { checkApiAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await checkApiAuth(request);
    const body = await request.json();
    const { email, role } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const album = await prisma.album.findUnique({
      where: { id },
    });

    if (!album || album.userId !== session.userId) {
      return NextResponse.json({ error: "Album not found or unauthorized" }, { status: 404 });
    }

    const invitedUser = await prisma.user.findUnique({
      where: { email },
    });

    if (!invitedUser) {
      return NextResponse.json({ error: "User with this email does not exist" }, { status: 404 });
    }

    if (invitedUser.id === session.userId) {
      return NextResponse.json({ error: "You cannot invite yourself" }, { status: 400 });
    }

    const share = await prisma.albumShare.upsert({
      where: {
        albumId_userId: {
          albumId: id,
          userId: invitedUser.id,
        },
      },
      update: {
        role: role || "VIEWER",
      },
      create: {
        albumId: id,
        userId: invitedUser.id,
        role: role || "VIEWER",
      },
    });

    return NextResponse.json({ share }, { status: 200 });
  } catch (error: any) {
    console.error("Invite API error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
