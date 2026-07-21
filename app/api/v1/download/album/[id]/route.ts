import { NextResponse } from "next/server";
import { checkApiAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

// Require archiver to avoid ES Module default export issues
const archiver = require("archiver");

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await checkApiAuth(request);
    const { id: albumId } = await params;

    const album = await prisma.album.findFirst({
      where: {
        id: albumId,
        userId: session.userId,
      },
      include: {
        photos: true
      }
    });

    if (!album) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    const photos = album.photos;

    if (photos.length === 0) {
      return NextResponse.json({ error: "Album is empty" }, { status: 400 });
    }

    const archive = archiver('zip', {
      zlib: { level: 5 }
    });

    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    
    archive.on('data', (chunk: Buffer) => {
      writer.write(chunk);
    });

    archive.on('end', () => {
      writer.close();
    });

    archive.on('error', (err: any) => {
      console.error("Archive error:", err);
      writer.abort(err);
    });

    (async () => {
      const addedNames = new Set<string>();
      
      for (const photo of photos) {
        if (!photo.url) continue;
        
        try {
          let ext = path.extname(photo.url).split('?')[0] || '.jpg';
          if (!ext || ext.length > 5) ext = '.jpg';
          
          let baseName = photo.altText || photo.id;
          baseName = baseName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
          if (baseName.length > 50) baseName = baseName.substring(0, 50);
          
          let fileName = `${baseName}${ext}`;
          let counter = 1;
          while (addedNames.has(fileName)) {
            fileName = `${baseName}_${counter}${ext}`;
            counter++;
          }
          addedNames.add(fileName);

          if (photo.url.startsWith('http')) {
            const response = await fetch(photo.url);
            if (!response.ok) continue;
            
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            archive.append(buffer, { name: fileName });
          } else {
            const localPath = path.join(process.cwd(), 'public', photo.url);
            if (fs.existsSync(localPath)) {
              archive.append(fs.createReadStream(localPath), { name: fileName });
            }
          }
        } catch (err) {
          console.error(`Error adding photo ${photo.id}:`, err);
        }
      }
      
      archive.finalize();
    })();

    const safeAlbumName = album.name.replace(/[^a-z0-9]/gi, '_');
    return new NextResponse(stream.readable as any, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${safeAlbumName}_memories.zip"`,
      }
    });

  } catch (error: any) {
    console.error("Download album error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
