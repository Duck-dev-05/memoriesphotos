import { NextResponse } from "next/server";
import { checkApiAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await checkApiAuth(request);

    const trashItems = await prisma.photo.findMany({
      where: { 
        userId: session.userId, 
        deletedAt: { not: null } 
      },
      orderBy: [
        { deletedAt: "desc" }
      ]
    });

    return NextResponse.json({ photos: trashItems });
  } catch (error: any) {
    console.error("Trash API error:", error);
    return NextResponse.json({ error: error.message || "Unauthorized" }, { status: 401 });
  }
}
