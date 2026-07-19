import { NextResponse } from "next/server";
import { checkApiAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await checkApiAuth(request);
    const body = await request.json();
    const { photoIds } = body;

    if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
      return NextResponse.json({ error: "Missing photoIds array" }, { status: 400 });
    }

    const result = await prisma.photo.updateMany({
      where: { 
        id: { in: photoIds }, 
        userId: session.userId 
      },
      data: { deletedAt: null }
    });

    return NextResponse.json({ success: true, count: result.count });
  } catch (error: any) {
    console.error("Restore Trash API error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
