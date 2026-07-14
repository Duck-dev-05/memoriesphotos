import { NextResponse } from "next/server";
import { checkApiAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await checkApiAuth(request);
    
    // Fetch recent photos to extract suggestions
    const photos = await prisma.photo.findMany({
      where: {
        userId: session.userId,
        deletedAt: null,
      },
      orderBy: [
        { dateTaken: "desc" },
        { createdAt: "desc" }
      ],
      select: {
        locationName: true,
        cameraMake: true,
        url: true,
      }
    });

    const placesMap = new Map<string, string>();
    const thingsMap = new Map<string, string>();

    for (const photo of photos) {
      if (photo.locationName && !placesMap.has(photo.locationName)) {
        placesMap.set(photo.locationName, photo.url || "");
      }
      if (photo.cameraMake && !thingsMap.has(photo.cameraMake)) {
        // Use camera make as a "thing/category"
        thingsMap.set(photo.cameraMake, photo.url || "");
      }
    }

    const places = Array.from(placesMap.entries()).map(([name, coverUrl]) => ({ name, coverUrl }));
    const things = Array.from(thingsMap.entries()).map(([name, coverUrl]) => ({ name, coverUrl }));

    return NextResponse.json({ places, things });
  } catch (error: any) {
    console.error("Suggestions API error:", error);
    return NextResponse.json({ error: error.message || "Unauthorized" }, { status: 401 });
  }
}
