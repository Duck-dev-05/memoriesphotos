import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  try {
    const dbNotifications = await prisma.notification.findMany({
      include: {
        user: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const notifications = dbNotifications.map(n => ({
      id: n.id,
      type: n.type, // Should match 'alert', 'report', 'system', 'info', 'success'
      title: `${n.type.toUpperCase()} Notification`,
      message: n.message,
      time: n.createdAt.toISOString(),
      unread: !n.isRead
    }));

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("Error in admin notifications API:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
