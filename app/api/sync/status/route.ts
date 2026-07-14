import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const lastPhoto = await prisma.photo.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    const lastAlbum = await prisma.album.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    return NextResponse.json({
      lastPhotoUpdate: lastPhoto?.createdAt?.toISOString() || null,
      lastAlbumUpdate: lastAlbum?.createdAt?.toISOString() || null,
    });
  } catch (error) {
    console.error('Error in /api/sync/status:', error);
    return NextResponse.json({ error: 'Failed to get sync status' }, { status: 500 });
  }
}
