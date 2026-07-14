import { NextResponse } from "next/server";
import { checkApiAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await checkApiAuth(request);

    const stories = await prisma.story.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      include: { photos: true }
    });

    return NextResponse.json({ stories });
  } catch (error: any) {
    console.error("About API error:", error);
    return NextResponse.json({ error: error.message || "Unauthorized" }, { status: 401 });
  }
}
