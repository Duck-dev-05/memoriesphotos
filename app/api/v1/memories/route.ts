import { NextResponse } from "next/server";
import { checkApiAuth } from "@/lib/auth";
import { getMemories } from "@/app/actions";

export async function GET(request: Request) {
  try {
    await checkApiAuth(request);

    // getMemories() already uses getSession() internally and handles caching & logic
    const memories = await getMemories();

    return NextResponse.json({ memories });
  } catch (error: any) {
    console.error("Memories API error:", error);
    return NextResponse.json({ error: error.message || "Unauthorized" }, { status: 401 });
  }
}
