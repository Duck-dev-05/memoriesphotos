import { NextResponse } from "next/server";
import { checkApiAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await checkApiAuth(request);

    const result = await prisma.photo.deleteMany({
      where: { 
        userId: session.userId,
        deletedAt: { not: null }
      }
    });

    return NextResponse.json({ success: true, count: result.count });
  } catch (error: any) {
    console.error("Empty Trash API error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
