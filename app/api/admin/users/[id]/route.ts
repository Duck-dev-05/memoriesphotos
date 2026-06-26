import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: userId } = await params;
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        photos: {
          select: { id: true, url: true, fileSize: true, createdAt: true, isFavorite: true },
          orderBy: { createdAt: 'desc' }
        },
        albums: { select: { id: true, name: true, createdAt: true } },
      }
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Calculate actual storage size
    let storageUsedBytes = 0;
    dbUser.photos.forEach(p => {
      if (p.fileSize) storageUsedBytes += p.fileSize;
    });

    const storageUsedMB = (storageUsedBytes / (1024 * 1024)).toFixed(1);

    // Format recent activity (combining photos and albums)
    const recentActivity = [
      ...dbUser.photos.slice(0, 3).map(p => ({
        type: 'photo',
        title: 'Uploaded a photo',
        time: p.createdAt.toISOString()
      })),
      ...dbUser.albums.slice(0, 3).map(a => ({
        type: 'album',
        title: `Created album "${a.name}"`,
        time: a.createdAt.toISOString()
      })),
      { type: 'login', title: 'Registered account', time: dbUser.createdAt.toISOString() }
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 4);

    const user = {
      id: dbUser.id,
      name: dbUser.name || "Unknown",
      email: dbUser.email,
      role: "USER", // Real schema doesn't have role, fallback
      status: "ACTIVE", // Real schema doesn't have status, fallback
      avatar: dbUser.image || null,
      joinDate: dbUser.createdAt.toISOString(),
      totalPhotos: dbUser.photos.length,
      storageUsed: storageUsedMB,
      recentActivity,
      photos: dbUser.photos.map(p => ({
        id: p.id,
        url: p.url,
        status: 'APPROVED', // Mocking status since there is no approval queue in schema
      }))
    };

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Error in admin user details API:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: userId } = await params;
    
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in admin user DELETE API:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
