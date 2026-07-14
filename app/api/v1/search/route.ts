import { NextResponse } from "next/server";
import { checkApiAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await checkApiAuth(request);
    
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";

    if (!query) {
      return NextResponse.json({ photos: [] });
    }

    const photos = await prisma.photo.findMany({
      where: {
        userId: session.userId,
        deletedAt: null,
        OR: [
          { altText: { contains: query } },
          { description: { contains: query } },
          { locationName: { contains: query } },
          { cameraMake: { contains: query } },
          { tags: { some: { name: { contains: query } } } },
          { album: { name: { contains: query } } }
        ]
      },
      orderBy: [
        { dateTaken: "desc" },
        { createdAt: "desc" }
      ],
      include: { album: true, tags: true }
    });

    console.log(`Search query: "${query}", found ${photos.length} photos.`);
    return NextResponse.json({ photos });
  } catch (error: any) {
    console.error("Search API error:", error);
    return NextResponse.json({ error: error.message || "Unauthorized" }, { status: 401 });
  }
}
