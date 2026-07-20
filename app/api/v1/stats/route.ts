import { NextResponse } from "next/server";
import { checkApiAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await checkApiAuth(request);

    // Get basic aggregations
    const [photosCount, albumsCount, favoritesCount, storageResult] = await Promise.all([
      prisma.photo.count({ where: { userId: session.userId, deletedAt: null } }),
      prisma.album.count({ where: { userId: session.userId, deletedAt: null } }),
      prisma.photo.count({ where: { userId: session.userId, isFavorite: true, deletedAt: null } }),
      prisma.photo.aggregate({
        where: { userId: session.userId, deletedAt: null },
        _sum: { fileSize: true }
      })
    ]);

    const totalSizeBytes = storageResult._sum.fileSize || 0;

    // Get photos created in the last 6 months for the monthly chart
    // To do this optimally without writing raw SQL for SQLite/Postgres compatibility,
    // we fetch just the `createdAt` field for the user's photos and group them in JS, 
    // which is significantly faster and uses less memory than fetching all photo rows.
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const recentPhotos = await prisma.photo.findMany({
      where: { 
        userId: session.userId, 
        deletedAt: null,
        createdAt: { gte: sixMonthsAgo } 
      },
      select: { createdAt: true }
    });

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentMonth = new Date().getMonth();
    const counts = Array(12).fill(0);

    recentPhotos.forEach(p => {
      counts[p.createdAt.getMonth()]++;
    });

    const monthlyUploads = [];
    for (let i = 6; i >= 0; i--) {
      let m = currentMonth - i;
      if (m < 0) m += 12;
      monthlyUploads.push({ month: monthNames[m], count: counts[m] });
    }

    return NextResponse.json({
      stats: {
        totalPhotos: photosCount,
        totalAlbums: albumsCount,
        totalFavorites: favoritesCount,
        totalSizeBytes,
        monthlyUploads
      }
    });

  } catch (error: any) {
    console.error("Stats API error:", error);
    return NextResponse.json({ error: error.message || "Unauthorized" }, { status: 401 });
  }
}
