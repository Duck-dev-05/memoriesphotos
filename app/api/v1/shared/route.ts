import { NextResponse } from "next/server";
import { checkApiAuth } from "@/lib/auth";
import { getSharedAlbums } from "@/app/actions";

export async function GET(request: Request) {
  try {
    await checkApiAuth(request);

    // getSharedAlbums() already handles fetching shared albums and checking session
    const albums = await getSharedAlbums();

    return NextResponse.json({ albums });
  } catch (error: any) {
    console.error("Shared API error:", error);
    return NextResponse.json({ error: error.message || "Unauthorized" }, { status: 401 });
  }
}
