import { NextResponse } from "next/server";
import { checkApiAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await checkApiAuth(request);
    const body = await request.json();
    const { id } = await params;

    const photo = await prisma.photo.update({
      where: { id: id, userId: session.userId },
      data: { albumId: body.albumId !== undefined ? body.albumId : undefined }
    });

    return NextResponse.json({ photo });
  } catch (error: any) {
    console.error("Update Photo API error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await checkApiAuth(request);
    const { id } = await params;

    await prisma.photo.delete({
      where: { id: id, userId: session.userId }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete Photo API error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
