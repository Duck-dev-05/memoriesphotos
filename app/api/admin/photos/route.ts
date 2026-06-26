import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get("status")
    const skip = parseInt(searchParams.get("skip") ?? "0")
    const take = parseInt(searchParams.get("take") ?? "50")

    const where: any = {}
    if (statusFilter === "PENDING") {
      where.isPublic = false;
    } else if (statusFilter === "APPROVED") {
      where.isPublic = true;
    }

    const [dbPhotos, total] = await Promise.all([
      prisma.photo.findMany({
        where,
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.photo.count({ where }),
    ])

    const photos = dbPhotos.map(p => ({
      id: p.id,
      url: p.url || null,
      size: p.fileSize ? `${(p.fileSize / (1024 * 1024)).toFixed(2)} MB` : "Unknown",
      status: p.isPublic ? "APPROVED" : "PENDING",
      date: p.createdAt.toISOString(),
      uploaderId: p.userId || "unknown",
      uploader: {
        name: p.user?.name || "Unknown",
        email: p.user?.email || "No Email"
      },
      createdAt: p.createdAt,
      updatedAt: p.createdAt,
    }));

    return NextResponse.json({ photos, total })
  } catch (error) {
    console.error("Error in admin photos API:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, status } = await request.json()
    
    let isPublic = undefined;
    if (status === "APPROVED") isPublic = true;
    else if (status === "REJECTED") isPublic = false;
    else if (status === "PENDING") isPublic = false;

    if (isPublic !== undefined) {
      await prisma.photo.update({
        where: { id },
        data: { isPublic }
      });
    }

    const dbPhoto = await prisma.photo.findUnique({
      where: { id },
      include: { user: { select: { name: true, email: true } } }
    });

    if (!dbPhoto) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    const photo = {
      id: dbPhoto.id,
      url: dbPhoto.url || null,
      size: dbPhoto.fileSize ? `${(dbPhoto.fileSize / (1024 * 1024)).toFixed(2)} MB` : "Unknown",
      status: dbPhoto.isPublic ? "APPROVED" : "PENDING",
      date: dbPhoto.createdAt.toISOString(),
      uploaderId: dbPhoto.userId || "unknown",
      uploader: {
        name: dbPhoto.user?.name || "Unknown",
        email: dbPhoto.user?.email || "No Email"
      },
      createdAt: dbPhoto.createdAt,
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json(photo)
  } catch (error) {
    console.error("Error in admin photos PATCH:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (id) {
      await prisma.photo.delete({ where: { id } })
      return NextResponse.json({ success: true })
    }
    return NextResponse.json({ error: "Missing ID" }, { status: 400 })
  } catch(error) {
    console.error("Error in admin photos DELETE:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
