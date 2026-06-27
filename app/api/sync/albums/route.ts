import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const albums = await prisma.album.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        coverImage: true,
        createdAt: true,
      },
    });
    return NextResponse.json(albums);
  } catch (error) {
    console.error("Error fetching albums for sync:", error);
    return NextResponse.json({ error: "Failed to fetch albums" }, { status: 500 });
  }
}
