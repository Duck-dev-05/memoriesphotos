import { NextResponse } from "next/server";
import { checkApiAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await checkApiAuth(request);

    await prisma.album.delete({
      where: {
        id: params.id,
        userId: session.userId
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete Album API error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await checkApiAuth(request);
    const body = await request.json();

    const album = await prisma.album.update({
      where: { id: params.id, userId: session.userId },
      data: { name: body.name }
    });

    return NextResponse.json({ album });
  } catch (error: any) {
    console.error("Update Album API error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
