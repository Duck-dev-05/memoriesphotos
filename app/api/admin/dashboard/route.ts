import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  try {
    const [totalUsers, totalPhotos] = await Promise.all([
      prisma.user.count(),
      prisma.photo.count(),
    ]);

    // Mock pending photos
    const pendingPhotos = await prisma.photo.count({
      where: { isPublic: false }
    });

    const photos = await prisma.photo.findMany({ select: { fileSize: true, createdAt: true, isPublic: true } });
    const totalSizeBytes = photos.reduce((acc, p) => acc + (p.fileSize || 0), 0);
    const storageUsedGB = parseFloat((totalSizeBytes / (1024 * 1024 * 1024)).toFixed(2));

    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const recentUsers = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, name: true, createdAt: true }
    });

    const recentPhotos = await prisma.photo.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, createdAt: true, user: { select: { name: true } } }
    });

    const dbUsers = await prisma.user.findMany({ select: { createdAt: true } });
    const users = dbUsers.map(u => ({ joined: u.createdAt.toISOString() }));

    const mappedPhotos = photos.map(p => ({
      uploadedAt: p.createdAt.toISOString(),
      status: p.isPublic ? 'Approved' : 'Pending',
      sizeMB: p.fileSize ? p.fileSize / (1024 * 1024) : 0
    }));

    const activities: any[] = [];

    recentUsers.forEach(u => {
      activities.push({
        id: `user-${u.id}`,
        message: `New user ${u.name} joined`,
        type: 'emerald',
        time: null,
        createdAt: u.createdAt,
      });
    });

    recentPhotos.forEach(p => {
      activities.push({
        id: `photo-${p.id}`,
        message: p.user?.name ? `New photo uploaded by ${p.user.name}` : `New photo uploaded`,
        type: 'blue',
        time: null,
        createdAt: p.createdAt,
      });
    });
    
    notifications.forEach(n => {
      // Map typical notification types to activity log types
      let mappedType = "default";
      const t = n.type.toLowerCase();
      if (t.includes("success")) mappedType = "emerald";
      else if (t.includes("error") || t.includes("fail")) mappedType = "red";
      else if (t.includes("warn")) mappedType = "amber";
      else if (t.includes("info")) mappedType = "blue";
      
      activities.push({
        id: `notif-${n.id}`,
        message: n.message,
        type: mappedType,
        time: null,
        createdAt: n.createdAt,
      });
    });

    // Sort by most recent and take top 8
    const activityLogs = activities
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);

    const settings = {};

    return NextResponse.json({
      totalUsers,
      totalPhotos,
      pendingPhotos,
      storageUsedGB,
      storageUsedBytes: totalSizeBytes,
      activityLogs,
      settings,
      users,
      photos: mappedPhotos,
    });
  } catch (error) {
    console.error("Error in admin dashboard API:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
