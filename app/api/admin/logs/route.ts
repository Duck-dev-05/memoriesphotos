import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  try {
    const [users, albums, photos] = await Promise.all([
      prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
      prisma.album.findMany({ include: { user: true }, orderBy: { createdAt: 'desc' }, take: 20 }),
      prisma.photo.findMany({ include: { user: true }, orderBy: { createdAt: 'desc' }, take: 20 })
    ]);

    const logs: any[] = [];
    let idCounter = 1;

    users.forEach(u => {
      logs.push({
        id: idCounter++,
        action: 'User Registered',
        target: u.name || 'Unknown',
        targetId: u.id,
        user: 'System',
        time: u.createdAt.toISOString(),
        status: 'success'
      });
    });

    albums.forEach(a => {
      logs.push({
        id: idCounter++,
        action: 'Album Created',
        target: a.name,
        targetId: a.id,
        user: a.user?.name || 'Unknown',
        time: a.createdAt.toISOString(),
        status: 'success'
      });
    });

    photos.forEach(p => {
      logs.push({
        id: idCounter++,
        action: 'Photo Uploaded',
        target: p.altText || 'Photo',
        targetId: p.id,
        user: p.user?.name || 'Unknown',
        time: p.createdAt.toISOString(),
        status: 'success'
      });
    });

    // Sort by time descending
    logs.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    // Take top 50
    const finalLogs = logs.slice(0, 50);

    return NextResponse.json({ logs: finalLogs });
  } catch (error) {
    console.error("Error in admin logs API:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
