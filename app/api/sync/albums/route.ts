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
        parentId: true,
      },
    });
    return NextResponse.json(albums);
  } catch (error) {
    console.error("Error fetching albums for sync:", error);
    return NextResponse.json({ error: "Failed to fetch albums" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    if (!Array.isArray(data)) {
      return NextResponse.json({ error: "Invalid data format, expected array" }, { status: 400 });
    }

    const results = [];
    for (const item of data) {
      if (!item.name) continue;

      let album;
      try {
        if (item.remoteId) {
          album = await prisma.album.update({
            where: { id: item.remoteId },
            data: {
              name: item.name,
              description: item.description,
              coverImage: item.coverImage,
              parentId: item.parentId,
            }
          });
        } else {
          album = await prisma.album.create({
            data: {
              name: item.name,
              description: item.description,
              coverImage: item.coverImage,
              parentId: item.parentId,
              createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
            }
          });
        }
        
        results.push({
          localId: item.localId,
          remoteId: album.id
        });
      } catch (err) {
        console.error(`Failed to process album ${item.name}:`, err);
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error syncing albums (POST):", error);
    return NextResponse.json({ error: "Failed to sync albums" }, { status: 500 });
  }
}
