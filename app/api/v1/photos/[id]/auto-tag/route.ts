import { NextResponse } from "next/server";
import { checkApiAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await checkApiAuth(request);
    const { id } = await params;

    const photo = await prisma.photo.findUnique({
      where: { id: id, userId: session.userId },
      include: { tags: true, album: true }
    });

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    const metadataTags = new Set<string>();

    // 1. Camera Make & Model
    if (photo.cameraMake) metadataTags.add(photo.cameraMake.toLowerCase().trim());
    if (photo.cameraModel) metadataTags.add(photo.cameraModel.toLowerCase().trim());

    // 2. Location
    if (photo.locationName) {
      // Add the whole location name if it's short, or split it by commas
      const parts = photo.locationName.split(",").map(p => p.trim().toLowerCase());
      parts.forEach(p => { if (p) metadataTags.add(p); });
    }

    // 3. Date Taken (Year and Month)
    if (photo.dateTaken) {
      const date = new Date(photo.dateTaken);
      const year = date.getFullYear().toString();
      metadataTags.add(year);
      
      const monthNames = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
      const month = monthNames[date.getMonth()];
      metadataTags.add(month);
    }

    // 4. Album Name
    if (photo.album && photo.album.title) {
      metadataTags.add(photo.album.title.toLowerCase().trim());
    }

    const aiTags = Array.from(metadataTags).filter(t => t.length > 0 && t.length < 50);

    // Get existing tags to avoid duplicates
    const existingTags = photo.tags.map(t => t.name.toLowerCase());
    const newTags = aiTags.filter((tag: string) => !existingTags.includes(tag));

    if (newTags.length === 0) {
        return NextResponse.json({ photo, message: "No new metadata tags found" }, { status: 200 });
    }

    // Connect or create new tags
    const tagConnectOrCreate = newTags.map((tag: string) => ({
      where: { name: tag },
      create: { name: tag },
    }));

    const updatedPhoto = await prisma.photo.update({
        where: { id: photo.id },
        data: {
            tags: {
                connectOrCreate: tagConnectOrCreate
            }
        },
        include: { tags: true }
    });

    return NextResponse.json({ photo: updatedPhoto, message: "Metadata tags applied successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("Metadata Auto-tag error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
