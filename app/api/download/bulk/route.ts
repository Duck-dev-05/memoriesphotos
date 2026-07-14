import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
const archiver = require("archiver");
import { PassThrough } from "stream";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let ids: string[] = [];
  try {
    const body = await req.json();
    ids = body.ids;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!ids || ids.length === 0) {
    return NextResponse.json({ error: "No photo IDs provided" }, { status: 400 });
  }

  // Fetch photos (only those belonging to this user)
  const photos = await prisma.photo.findMany({
    where: {
      id: { in: ids },
      userId: session.userId,
      deletedAt: null,
    },
    select: { id: true, url: true, altText: true },
  });

  if (photos.length === 0) {
    return NextResponse.json({ error: "No valid photos found" }, { status: 404 });
  }

  // Build a ZIP stream
  const archive = archiver("zip", { zlib: { level: 5 } });
  const passThrough = new PassThrough();
  archive.pipe(passThrough);

  // Append each photo into the archive
  const appendPromises = photos.map(async (photo, idx) => {
    if (!photo.url) return;
    try {
      const resp = await fetch(photo.url);
      if (!resp.ok || !resp.body) return;

      // Determine extension from URL or default to jpg
      const urlPath = new URL(photo.url).pathname;
      const ext = urlPath.split(".").pop()?.split("?")[0] || "jpg";
      const safeName = (photo.altText || `photo-${idx + 1}`)
        .replace(/[^a-z0-9\-_.]/gi, "_")
        .slice(0, 60);
      const filename = `${safeName}_${photo.id.slice(-6)}.${ext}`;

      // Use Node.js Readable from web ReadableStream
      const { Readable } = await import("stream");
      const nodeStream = Readable.fromWeb(resp.body as any);
      archive.append(nodeStream, { name: filename });
    } catch (e) {
      console.error(`Failed to fetch photo ${photo.id}:`, e);
    }
  });

  await Promise.all(appendPromises);
  archive.finalize();

  // Collect streamed data
  const chunks: Buffer[] = [];
  for await (const chunk of passThrough) {
    chunks.push(chunk as Buffer);
  }
  const zipBuffer = Buffer.concat(chunks);

  return new NextResponse(zipBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="memories-${Date.now()}.zip"`,
      "Content-Length": String(zipBuffer.length),
    },
  });
}
