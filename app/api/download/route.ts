import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import JSZip from "jszip";
import { getSession } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const { searchParams } = new URL(request.url);
    const ids = searchParams.get("ids");
    if (!ids) return new NextResponse("No IDs provided", { status: 400 });

    const idArray = ids.split(",");
    
    // Limit to max 50 for safety
    if (idArray.length > 50) {
      return new NextResponse("Maximum 50 photos allowed per download batch", { status: 400 });
    }

    const photos = await prisma.photo.findMany({
      where: { id: { in: idArray }, userId: session.userId, deletedAt: null }
    });

    if (photos.length === 0) return new NextResponse("No photos found", { status: 404 });

    const zip = new JSZip();

    for (let i = 0; i < photos.length; i++) {
      const p = photos[i];
      let url = p.url;
      if (!url) continue;

      const altSafe = p.altText ? p.altText.replace(/[^a-z0-9]/gi, '_').substring(0, 10) : 'photo';

      try {
        if (url.startsWith("/")) {
           // Local file
           const fileBuffer = await fs.readFile(path.join(process.cwd(), "public", url));
           const ext = url.split('.').pop() || 'jpg';
           zip.file(`photo_${i + 1}_${altSafe}.${ext}`, fileBuffer);
        } else {
           // Remote URL (e.g., Cloudinary)
           const response = await fetch(url);
           const arrayBuffer = await response.arrayBuffer();
           const ext = url.split('.').pop()?.split('?')[0] || 'jpg';
           zip.file(`photo_${i + 1}_${altSafe}.${ext}`, arrayBuffer);
        }
      } catch (err) {
        console.error(`Failed to add photo to zip:`, err);
      }
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    return new NextResponse(zipBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="memories_export_${Date.now()}.zip"`
      }
    });

  } catch (error) {
    console.error("Download error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
