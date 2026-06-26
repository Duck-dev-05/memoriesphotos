import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") ?? ""
    const skip = parseInt(searchParams.get("skip") ?? "0")
    const take = parseInt(searchParams.get("take") ?? "50")

    const where = search
      ? {
          OR: [
            { name: { contains: search } },
            { email: { contains: search } },
          ],
        }
      : {}

    const [dbUsers, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: { _count: { select: { photos: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.user.count({ where }),
    ])

    const users = dbUsers.map(u => ({
      id: u.id,
      name: u.name || "Unknown",
      email: u.email,
      role: "USER",
      status: "ACTIVE",
      avatar: u.image || null,
      joinDate: u.createdAt.toISOString(),
      createdAt: u.createdAt,
      updatedAt: u.createdAt,
      _count: u._count
    }));

    return NextResponse.json({ users, total })
  } catch (error) {
    console.error("Error in admin users API:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, status, role } = await request.json()
    const dbUser = await prisma.user.findUnique({ where: { id } });
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const user = {
      id: dbUser.id,
      name: dbUser.name || "Unknown",
      email: dbUser.email,
      role: role || "USER",
      status: status || "ACTIVE",
      avatar: dbUser.image || null,
      joinDate: dbUser.createdAt.toISOString(),
      createdAt: dbUser.createdAt,
      updatedAt: new Date().toISOString(),
    };
    return NextResponse.json(user)
  } catch (error) {
    console.error("Error in admin users PATCH:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
