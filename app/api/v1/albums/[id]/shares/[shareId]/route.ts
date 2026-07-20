import { NextResponse } from "next/server";
import { checkApiAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: { id: string, shareId: string } }) {
  try {
    const session = await checkApiAuth(request);
    const body = await request.json();
    const { role } = body;

    const album = await prisma.album.findUnique({
      where: { id: params.id },
    });

    if (!album || album.userId !== session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const share = await prisma.albumShare.update({
      where: { id: params.shareId },
      data: { role }
    });

    return NextResponse.json({ share });
  } catch (error: any) {
    console.error("Update share API error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string, shareId: string } }) {
  try {
    const session = await checkApiAuth(request);

    const album = await prisma.album.findUnique({
      where: { id: params.id },
    });

    if (!album || album.userId !== session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.albumShare.delete({
      where: { id: params.shareId }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete share API error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
