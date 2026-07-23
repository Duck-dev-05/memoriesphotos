import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function GET() {
  try {
    const photos = await prisma.photo.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        altText: true,
        url: true,
        cloudUrl: true,
        imageData: true,
        latitude: true,
        longitude: true,
        locationName: true,
        cameraMake: true,
        cameraModel: true,
        createdAt: true,
        isPublic: true,
        fileSize: true,
        width: true,
        height: true,
        user: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // STRICT REAL DATA ONLY: Filter photos that have actual GPS coordinates or location names stored in DB
    const photosWithGeo = photos.filter((p: { latitude: number | null; longitude: number | null; locationName: string | null }) => {
      const hasCoords = p.latitude !== null && p.longitude !== null && !isNaN(p.latitude) && !isNaN(p.longitude);
      const hasLocationName = p.locationName && p.locationName.trim().length > 0;
      return hasCoords || hasLocationName;
    });

    const geoPhotos = photosWithGeo.map((p: any) => {
      const sizeMB = p.fileSize ? (p.fileSize / (1024 * 1024)).toFixed(1) + ' MB' : '1.5 MB';
      const location = p.locationName ? p.locationName.trim() : 'GPS Position';
      const country = location.includes(',') ? location.split(',').pop()?.trim() || 'Unknown' : 'Unknown';

      return {
        id: p.id,
        title: p.altText || (p.url ? p.url.split('/').pop() : 'Photo'),
        url: p.url || p.cloudUrl || p.imageData || null,
        lat: p.latitude || 0,
        lng: p.longitude || 0,
        location,
        country,
        uploader: p.user?.name || 'Unknown User',
        camera: (p.cameraMake || p.cameraModel) ? `${p.cameraMake || ''} ${p.cameraModel || ''}`.trim() : 'Unknown Device',
        date: p.createdAt ? new Date(p.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        size: sizeMB,
        isPublic: p.isPublic,
      };
    });

    // Group photo clusters strictly by real location names
    const clusterMap: Record<string, { name: string; country: string; lat: number; lng: number; count: number; photos: typeof geoPhotos }> = {};

    geoPhotos.forEach((gp: any) => {
      if (!clusterMap[gp.location]) {
        clusterMap[gp.location] = {
          name: gp.location,
          country: gp.country,
          lat: gp.lat,
          lng: gp.lng,
          count: 0,
          photos: [],
        };
      }
      clusterMap[gp.location].count++;
      clusterMap[gp.location].photos.push(gp);
    });

    const clusters = Object.values(clusterMap).sort((a, b) => b.count - a.count);
    const totalCountries = new Set(geoPhotos.map((gp: any) => gp.country).filter((c: string) => c !== 'Unknown')).size;

    return NextResponse.json({
      source: 'memoriesphotos-api',
      photos: geoPhotos,
      clusters,
      totalPhotos: photos.length,
      totalGeoPhotos: geoPhotos.length,
      totalNonGeoPhotos: photos.length - geoPhotos.length,
      totalClusters: clusters.length,
      totalCountries,
    });
  } catch (error) {
    console.error('Error in memoriesphotos admin map API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
