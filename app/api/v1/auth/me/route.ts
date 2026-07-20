import { NextResponse } from "next/server";
import { checkApiAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await checkApiAuth(request);
    
    // Fetch user stats
    const [photosCount, albumsCount, photos] = await Promise.all([
      prisma.photo.count({ where: { userId: session.userId, deletedAt: null } }),
      prisma.album.count({ where: { userId: session.userId, deletedAt: null } }),
      prisma.photo.findMany({ 
        where: { userId: session.userId, deletedAt: null },
        select: { fileSize: true } 
      })
    ]);

    const storageUsed = photos.reduce((acc, photo) => acc + (photo.fileSize || 0), 0);

    return NextResponse.json({
      user: {
        id: session.userId,
        email: session.email,
        name: session.name,
        image: session.image,
      },
      stats: {
        photosCount,
        albumsCount,
        storageUsed
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Unauthorized" }, { status: 401 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await checkApiAuth(request);
    
    await prisma.user.delete({
      where: { id: session.userId }
    });

    return NextResponse.json({ success: true, message: "Account deleted successfully" });
  } catch (error: any) {
    console.error("Failed to delete account:", error);
    return NextResponse.json({ error: error.message || "Failed to delete account" }, { status: 500 });
  }
}
