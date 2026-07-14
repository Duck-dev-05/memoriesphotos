import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  try {
    const photos = await prisma.photo.findMany({ select: { fileSize: true } });
    const totalSizeBytes = photos.reduce((acc, p) => acc + (p.fileSize || 0), 0);
    const storageUsedGB = parseFloat((totalSizeBytes / (1024 * 1024 * 1024)).toFixed(2));

    const settings = {};

    return NextResponse.json({
      settings,
      storageUsedGB,
      storageQuotaGB: 100
    });
  } catch (error) {
    console.error("Error in admin settings API:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
