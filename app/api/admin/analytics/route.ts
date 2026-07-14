import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  try {
    const [totalUsers, dbPhotos] = await Promise.all([
      prisma.user.count(),
      prisma.photo.findMany({ select: { createdAt: true } })
    ]);

    // Active users logic: just use all users for now since we don't have a status field in memoriesphotos User model
    const users = await prisma.user.findMany({ select: { createdAt: true } });
    
    // New signups in the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const newSignups = users.filter(u => u.createdAt >= thirtyDaysAgo).length;

    // We map createdAt to joined and uploadedAt to match what the admin panel expects
    const mappedUsers = users.map(u => ({ joined: u.createdAt.toISOString() }));
    const mappedPhotos = dbPhotos.map(p => ({ uploadedAt: p.createdAt.toISOString() }));

    return NextResponse.json({
      totalUsers,
      activeUsersCount: users.length,
      totalPhotosCount: dbPhotos.length,
      newSignups,
      users: mappedUsers,
      photos: mappedPhotos
    });
  } catch (error) {
    console.error("Error in admin analytics API:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
