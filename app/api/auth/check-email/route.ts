import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, passwordHash: true },
    });

    if (user) {
      if (!user.passwordHash) {
        return NextResponse.json({ exists: true, isOAuth: true });
      }
      return NextResponse.json({ exists: true, isOAuth: false });
    } else {
      return NextResponse.json({ exists: false });
    }
  } catch (error) {
    console.error("Error checking email:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
