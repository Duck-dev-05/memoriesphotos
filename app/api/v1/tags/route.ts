import { NextResponse } from "next/server";
import { checkApiAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await checkApiAuth(request);

    // Get all tags that are attached to at least one of the user's photos
    const tags = await prisma.tag.findMany({
      where: {
        photos: {
          some: {
            userId: session.userId,
            deletedAt: null
          }
        }
      },
      orderBy: { name: "asc" }
    });

    return NextResponse.json({ tags });
  } catch (error: any) {
    console.error("Get Tags API error:", error);
    return NextResponse.json({ error: error.message || "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await checkApiAuth(request);
    const body = await request.json();
    const { name, photoId } = body;

    if (!name) {
      return NextResponse.json({ error: "Tag name is required" }, { status: 400 });
    }

    const tagName = name.toLowerCase().trim();

    // Find or create the tag globally
    let tag = await prisma.tag.findUnique({ where: { name: tagName } });
    if (!tag) {
      tag = await prisma.tag.create({ data: { name: tagName } });
    }

    // If photoId is provided, attach the tag to the photo (ensuring user owns it)
    if (photoId) {
      const photo = await prisma.photo.findUnique({
        where: { id: photoId, userId: session.userId }
      });
      
      if (photo) {
        await prisma.photo.update({
          where: { id: photoId },
          data: {
            tags: {
              connect: { id: tag.id }
            }
          }
        });
      } else {
        return NextResponse.json({ error: "Photo not found" }, { status: 404 });
      }
    }

    return NextResponse.json({ tag });
  } catch (error: any) {
    console.error("Create Tag API error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
