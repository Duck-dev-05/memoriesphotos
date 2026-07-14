import { NextResponse } from "next/server";
import { checkApiAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await checkApiAuth(request);

    const timeline = await prisma.photo.findMany({
      where: { userId: session.userId, deletedAt: null },
      orderBy: [
        { dateTaken: "desc" },
        { createdAt: "desc" }
      ],
      include: { album: true, tags: true }
    });

    return NextResponse.json({ photos: timeline });
  } catch (error: any) {
    console.error("Photos API error:", error);
    return NextResponse.json({ error: error.message || "Unauthorized" }, { status: 401 });
  }
}
