import { NextResponse } from "next/server";
import { checkApiAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await checkApiAuth(request);

    // Prisma doesn't easily allow count filtering by relation condition in the select natively 
    // without returning the full related array if we want just the count of *user's* photos.
    // So we fetch tags that the user has, and count them manually or use grouping.
    
    const tags = await prisma.tag.findMany({
      where: {
        photos: {
          some: {
            userId: session.userId,
            deletedAt: null
          }
        }
      },
      include: {
        photos: {
          where: {
            userId: session.userId,
            deletedAt: null
          },
          select: { id: true }
        }
      }
    });

    const tagsWithCount = tags.map(tag => ({
      id: tag.id,
      name: tag.name,
      count: tag.photos.length
    })).sort((a, b) => b.count - a.count); // Sort by most used

    return NextResponse.json({ tags: tagsWithCount });
  } catch (error: any) {
    console.error("Get Tags Count API error:", error);
    return NextResponse.json({ error: error.message || "Unauthorized" }, { status: 401 });
  }
}
