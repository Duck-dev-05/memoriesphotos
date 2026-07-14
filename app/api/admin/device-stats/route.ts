import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  try {
    const [totalPhotos, totalAlbums, favorites] = await Promise.all([
      prisma.photo.count({ where: { deletedAt: null } }),
      prisma.album.count({ where: { deletedAt: null } }),
      prisma.photo.count({ where: { deletedAt: null, isFavorite: true } }),
    ]);

    const photos = await prisma.photo.findMany({
      where: { deletedAt: null },
      select: { cameraMake: true, cameraModel: true, iso: true, lensModel: true, focalLength: true }
    });

    const countBy = (key: string) => {
      const counts: Record<string, number> = {};
      for (const p of photos) {
        const val = (p as any)[key];
        if (val !== null && val !== undefined) {
          let strVal = String(val).trim();
          if (key === 'cameraMake' && strVal.toLowerCase().includes('apple')) strVal = 'Apple';
          if (key === 'cameraMake' && strVal.toLowerCase().includes('sony')) strVal = 'Sony';
          if (key === 'cameraMake' && strVal.toLowerCase().includes('canon')) strVal = 'Canon';
          if (key === 'cameraMake' && strVal.toLowerCase().includes('nikon')) strVal = 'Nikon';
          
          if (strVal) {
            counts[strVal] = (counts[strVal] || 0) + 1;
          }
        }
      }
      return Object.entries(counts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
    };

    const stats = {
      makes: countBy('cameraMake'),
      models: countBy('cameraModel'),
      isos: countBy('iso'),
      lenses: countBy('lensModel'),
      focalLengths: countBy('focalLength')
    };

    return NextResponse.json({
      overview: {
        photos: totalPhotos,
        albums: totalAlbums,
        favorites: favorites
      },
      stats
    });
  } catch (error) {
    console.error("Error in admin device-stats API:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
