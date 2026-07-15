"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import fs from "fs/promises";
import path from "path";
import exifr from "exifr";
import bcrypt from "bcryptjs";
import { checkAuthServerAction, createSessionCookie, deleteSessionCookie, getSession } from "@/lib/auth";
import { v2 as cloudinary } from "cloudinary";
import type { UploadApiResponse } from "cloudinary";
import { getCache, setCache, invalidatePattern, clearUserCache } from "@/lib/redis";
import { pipeline, env } from "@xenova/transformers";
import { syncLocalPhotoToCloud } from "./photo-sync";
import { saveUploadedFileBufferLocally } from "./auth";

// Optional: don't load local models, fetch from HuggingFace
env.allowLocalModels = false;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});



export async function getDeletedPhotos() {
  const session = await getSession();
  if (!session) return [];

  const cacheKey = `user:${session.userId}:deleted:photos`;
  const cached = await getCache<any>(cacheKey);
  if (cached) return cached;

  const photos = await prisma.photo.findMany({
    where: { userId: session.userId, deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
  });

  await setCache(cacheKey, photos);
  return photos;
}

export async function getDeletedAlbums() {
  const session = await getSession();
  if (!session) return [];

  const cacheKey = `user:${session.userId}:deleted:albums`;
  const cached = await getCache<any>(cacheKey);
  if (cached) return cached;

  const albums = await prisma.album.findMany({
    where: { userId: session.userId, deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
    include: {
      _count: { select: { photos: true } }
    }
  });

  await setCache(cacheKey, albums);
  return albums;
}

export async function emptyTrash() {
  const session = await checkAuthServerAction();

  const photos = await prisma.photo.findMany({
    where: { userId: session.userId, deletedAt: { not: null } },
  });

  for (const photo of photos) {
    try {
      if (photo.url && photo.url.includes("cloudinary.com")) {
        const parts = photo.url.split("/");
        const filename = parts[parts.length - 1];
        const folder = parts[parts.length - 2];
        const publicId = `${folder}/${filename.split(".")[0]}`;
        await cloudinary.uploader.destroy(publicId);
      }
    } catch (e) {
      console.error(e);
    }
  }

  await prisma.photo.deleteMany({
    where: { userId: session.userId, deletedAt: { not: null } },
  });

  await prisma.album.deleteMany({
    where: { userId: session.userId, deletedAt: { not: null } },
  });

  await clearUserCache(session.userId);
  revalidatePath("/trash", "layout");
}

export async function getTimelinePhotos() {
  const session = await getSession();
  if (!session) return [];

  const cacheKey = `user:${session.userId}:timeline`;
  const cached = await getCache<any>(cacheKey);
  if (cached) return cached;

  const timeline = await prisma.photo.findMany({
    where: { userId: session.userId, deletedAt: null },
    orderBy: [
      { dateTaken: "desc" },
      { createdAt: "desc" }
    ],
    include: { album: true, tags: true }
  });

  await setCache(cacheKey, timeline);
  return timeline;
}

// ==========================================
// NEW FEATURES: MEMORIES, BULK ACTIONS, SHARING, TAGS
// ==========================================

export async function getMemories() {
  const session = await getSession();
  if (!session) return [];

  // Create a cache key unique to the user and the current day (YYYY-MM-DD)
  const todayDateStr = new Date().toISOString().split('T')[0];
  const cacheKey = `user:${session.userId}:memories:${todayDateStr}`;
  const cached = await getCache<any>(cacheKey);
  if (cached) return cached;

  // 1. Fetch ONLY id and dateTaken to avoid pulling massive payloads into memory
  const allDates = await prisma.photo.findMany({
    where: { userId: session.userId, deletedAt: null, dateTaken: { not: null } },
    select: { id: true, dateTaken: true },
    orderBy: { dateTaken: "desc" }
  });

  const today = new Date();
  const currentMonth = today.getMonth();
  const currentDay = today.getDate();

  // 2. Filter in-memory for matching month and day, but different year
  const memoryIds = allDates.filter(p => {
    if (!p.dateTaken) return false;
    const photoDate = new Date(p.dateTaken);
    return photoDate.getMonth() === currentMonth &&
      photoDate.getDate() === currentDay &&
      photoDate.getFullYear() !== today.getFullYear();
  }).slice(0, 12).map(p => p.id);

  if (memoryIds.length === 0) return [];

  // 3. Fetch full records for ONLY the matched memories
  const memories = await prisma.photo.findMany({
    where: { id: { in: memoryIds } },
    include: { album: true, tags: true },
    orderBy: { dateTaken: "desc" }
  });

  // Cache for 24 hours
  await setCache(cacheKey, memories, 60 * 60 * 24);

  return memories;
}

export async function bulkDeletePhotos(ids: string[]) {
  const session = await checkAuthServerAction();
  if (!ids || ids.length === 0) return;

  await prisma.photo.updateMany({
    where: { id: { in: ids }, userId: session.userId },
    data: { deletedAt: new Date() }
  });

  await clearUserCache(session.userId);
  revalidatePath("/", "layout");
}

export async function bulkAddToAlbum(photoIds: string[], albumId: string) {
  const session = await checkAuthServerAction();
  if (!photoIds || photoIds.length === 0) return;

  const album = await prisma.album.findUnique({ where: { id: albumId } });
  if (!album || album.userId !== session.userId) throw new Error('Unauthorized');

  await prisma.photo.updateMany({
    where: { id: { in: photoIds }, userId: session.userId },
    data: { albumId }
  });

  await clearUserCache(session.userId);
  revalidatePath('/', 'layout');
  revalidatePath('/albums/' + albumId, 'layout');
}

export async function bulkRemoveFromAlbum(photoIds: string[]) {
  const session = await checkAuthServerAction();
  if (!photoIds || photoIds.length === 0) return;

  await prisma.photo.updateMany({
    where: { id: { in: photoIds }, userId: session.userId },
    data: { albumId: null }
  });

  await clearUserCache(session.userId);
  revalidatePath('/', 'layout');
}

export async function bulkToggleFavorite(ids: string[], isFavorite: boolean) {
  const session = await checkAuthServerAction();
  if (!ids || ids.length === 0) return;

  await prisma.photo.updateMany({
    where: { id: { in: ids }, userId: session.userId },
    data: { isFavorite }
  });

  await clearUserCache(session.userId);
  revalidatePath('/', 'layout');
  revalidatePath('/favorites', 'layout');
}

export async function generateShareLink(albumId: string) {
  const session = await checkAuthServerAction();

  const album = await prisma.album.findUnique({ where: { id: albumId } });
  if (!album || album.userId !== session.userId) throw new Error("Unauthorized");

  if (album.shareToken) return album.shareToken;

  const token = crypto.randomUUID().replace(/-/g, "");

  await prisma.album.update({
    where: { id: albumId },
    data: { isPublic: true, shareToken: token }
  });

  await clearUserCache(session.userId);
  revalidatePath(`/albums/${albumId}`, "layout");
  revalidatePath("/shared-albums", "layout");
  return token;
}

export async function removeShareLink(albumId: string) {
  const session = await checkAuthServerAction();

  const album = await prisma.album.findUnique({ where: { id: albumId } });
  if (!album || album.userId !== session.userId) throw new Error("Unauthorized");

  await prisma.album.update({
    where: { id: albumId },
    data: { isPublic: false, shareToken: null, isCollaborative: false }
  });

  await clearUserCache(session.userId);
  revalidatePath(`/albums/${albumId}`, "layout");
  revalidatePath("/shared-albums", "layout");
}

export async function toggleCollaborative(albumId: string, isCollaborative: boolean) {
  const session = await checkAuthServerAction();

  const album = await prisma.album.findUnique({ where: { id: albumId } });
  if (!album || album.userId !== session.userId) throw new Error("Unauthorized");

  await prisma.album.update({
    where: { id: albumId },
    data: { isCollaborative }
  });

  await clearUserCache(session.userId);
  revalidatePath(`/albums/${albumId}`, "layout");
  revalidatePath("/shared-albums", "layout");
}

export async function uploadGuestPhoto(token: string, formData: FormData) {
  const session = await checkAuthServerAction();

  const file = formData.get("file") as File;
  const altText = formData.get("altText") as string;
  const description = formData.get("description") as string;

  if (!file) throw new Error("File is required");

  // Verify the shared album allows collaboration
  const album = await prisma.album.findUnique({
    where: { shareToken: token }
  });

  if (!album || !album.isPublic || !album.isCollaborative) {
    throw new Error("Tải lên không được phép cho album này");
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const isVideo = ["mp4", "mov", "avi", "webm", "mkv"].includes(ext);
  const uploadUrl = await saveUploadedFileBufferLocally(buffer, file);

  let dateTaken = null;
  const fileSize = buffer.length;

  try {
    const exifr = require('exifr');
    const exifData = await exifr.parse(buffer, {
      tiff: true,
      exif: true,
      gps: true,
      reviveValues: true,
    });

    if (exifData) {
      if (exifData.DateTimeOriginal) {
        dateTaken = new Date(exifData.DateTimeOriginal);
      } else if (exifData.CreateDate) {
        dateTaken = new Date(exifData.CreateDate);
      }
    }
  } catch (error) {
    console.error("Failed to parse EXIF:", error);
  }

  // Upload guest photo and assign to the logged-in user
  await prisma.photo.create({
    data: {
      url: uploadUrl,
      altText: altText || "Guest photo",
      description,
      albumId: album.id,
      dateTaken,
      userId: session.userId, // Ownership goes to the uploader
      isPublic: true,
    },
  });

  if (session.userId) {
    await clearUserCache(session.userId);
  }
  if (album.userId && album.userId !== session.userId) {
    await clearUserCache(album.userId);
  }
  revalidatePath(`/shared/${token}`, "page");
  revalidatePath(`/albums/${album.id}`, "layout");

  // Trigger background sync and cleanup if it was saved locally
  const guestPhoto = await prisma.photo.findFirst({
    where: { url: uploadUrl, albumId: album.id, userId: session.userId },
    orderBy: { createdAt: "desc" }
  });
  if (guestPhoto && guestPhoto.url && guestPhoto.url.startsWith("/uploads/")) {
    syncLocalPhotoToCloud(guestPhoto.id, guestPhoto.url).catch((err) => {
      console.warn("Background cloud sync failed for guest upload:", err);
    });
  }
}

export async function saveGuestUploadedPhotoRecord(token: string, payload: {
  url: string;
  altText?: string;
  description?: string;
  exifData?: {
    dateTaken?: Date | null;
  }
}) {
  const session = await checkAuthServerAction();

  // Verify the shared album allows collaboration
  const album = await prisma.album.findUnique({
    where: { shareToken: token }
  });

  if (!album || !album.isPublic || !album.isCollaborative) {
    throw new Error("Tải lên không được phép cho album này");
  }

  const photo = await prisma.photo.create({
    data: {
      url: payload.url,
      altText: payload.altText || "Guest photo",
      description: payload.description || "",
      albumId: album.id,
      dateTaken: payload.exifData?.dateTaken || null,
      userId: session.userId, // Ownership goes to the uploader
      isPublic: true,
    },
  });

  if (session.userId) {
    await clearUserCache(session.userId);
  }
  if (album.userId && album.userId !== session.userId) {
    await clearUserCache(album.userId);
  }
  revalidatePath(`/shared/${token}`, "page");
  revalidatePath(`/albums/${album.id}`, "layout");

  // Trigger background sync and cleanup if it was saved locally
  if (photo.url && photo.url.startsWith("/uploads/")) {
    syncLocalPhotoToCloud(photo.id, photo.url).catch((err) => {
      console.warn("Background cloud sync failed for guest upload:", err);
    });
  }
}

export async function getSharedAlbums() {
  const session = await getSession();
  if (!session) return [];

  const cacheKey = `user:${session.userId}:shared:albums:v2`;
  const cached = await getCache<any>(cacheKey);
  if (cached) return cached;

  const albums = await prisma.album.findMany({
    where: {
      userId: session.userId,
      deletedAt: null,
      isPublic: true,
      shareToken: { not: null }
    },
    include: {
      _count: { select: { photos: { where: { deletedAt: null } } } }
    },
    orderBy: { createdAt: "desc" }
  });

  await setCache(cacheKey, albums);
  return albums;
}

export async function generatePhotoShareLink(photoId: string) {
  const session = await checkAuthServerAction();

  const photo = await prisma.photo.findUnique({ where: { id: photoId } });
  if (!photo || photo.userId !== session.userId) {
    throw new Error("Không có quyền truy cập");
  }

  const token = crypto.randomUUID().replace(/-/g, "");

  await prisma.photo.update({
    where: { id: photoId },
    data: { isPublic: true, shareToken: token }
  });

  await clearUserCache(session.userId);
  revalidatePath(`/photo/${photoId}`, "layout");
  return token;
}

export async function removePhotoShareLink(photoId: string) {
  const session = await checkAuthServerAction();

  const photo = await prisma.photo.findUnique({ where: { id: photoId } });
  if (!photo || photo.userId !== session.userId) {
    throw new Error("Không có quyền truy cập");
  }

  await prisma.photo.update({
    where: { id: photoId },
    data: { isPublic: false, shareToken: null }
  });

  await clearUserCache(session.userId);
  revalidatePath(`/photo/${photoId}`, "layout");
}

export async function getPublicAlbum(token: string) {
  // Public access, no session check required
  const album = await prisma.album.findUnique({
    where: { shareToken: token },
    include: {
      user: { select: { name: true } },
      photos: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
      },
      children: {
        where: { deletedAt: null },
        include: {
          photos: {
            where: { deletedAt: null },
            orderBy: { createdAt: "desc" }
          }
        }
      }
    },
  });

  if (!album || !album.isPublic || album.deletedAt) return null;

  // Flatten photos from immediate sub-albums
  let allPhotos = [...album.photos];
  if (album.children && album.children.length > 0) {
    album.children.forEach(child => {
      if (child.photos) {
        allPhotos = [...allPhotos, ...child.photos];
      }
    });
    // Sort combined photos
    allPhotos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  return { ...album, photos: allPhotos };
}

export async function getTags() {
  const session = await getSession();
  if (!session) return [];

  // Group tags that belong to photos owned by the user
  const tags = await prisma.tag.findMany({
    where: {
      photos: { some: { userId: session.userId, deletedAt: null } }
    },
    include: {
      _count: {
        select: { photos: { where: { userId: session.userId, deletedAt: null } } }
      }
    },
    orderBy: { name: 'asc' }
  });

  return tags;
}

export async function getPhotosByTag(tagName: string) {
  const session = await getSession();
  if (!session) return [];

  const photos = await prisma.photo.findMany({
    where: {
      userId: session.userId,
      deletedAt: null,
      tags: { some: { name: tagName } }
    },
    include: { album: true, tags: true },
    orderBy: { createdAt: "desc" }
  });

  return photos;
}

export async function getPhotosWithLocation() {
  const session = await getSession();
  if (!session) return [];

  const cacheKey = `user:${session.userId}:photos:location`;
  const cached = await getCache<any>(cacheKey);
  if (cached) return cached;

  const photos = await prisma.photo.findMany({
    where: {
      userId: session.userId,
      deletedAt: null,
      latitude: { not: null },
      longitude: { not: null },
      OR: [
        { albumId: null },
        { album: { deletedAt: null } }
      ]
    },
    include: { album: true },
    orderBy: { dateTaken: "desc" }
  });

  await setCache(cacheKey, photos);
  return photos;
}

export async function getAdjacentPhotos(currentId: string, albumId: string | null = null) {
  const session = await getSession();
  if (!session) return { prevId: null, nextId: null };

  try {
    const whereClause: any = { userId: session.userId, deletedAt: null };
    if (albumId) whereClause.albumId = albumId;

    const photos = await prisma.photo.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      select: { id: true }
    });

    const currentIndex = photos.findIndex((p: any) => p.id === currentId);
    if (currentIndex === -1) return { prevId: null, nextId: null };

    // "Next" visually means going to the older photo (next in the desc array)
    const nextId = currentIndex < photos.length - 1 ? photos[currentIndex + 1].id : null;
    // "Prev" visually means going to the newer photo (prev in the desc array)
    const prevId = currentIndex > 0 ? photos[currentIndex - 1].id : null;

    return { prevId, nextId };
  } catch (error) {
    console.error("Error getting adjacent photos:", error);
    return { prevId: null, nextId: null };
  }
}

export async function getCameraStats() {
  const session = await getSession();
  if (!session) return { makes: [], models: [], isos: [], lenses: [], focalLengths: [] };

  const cacheKey = `stats:${session.userId}`;
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const photos = await prisma.photo.findMany({
    where: { userId: session.userId, deletedAt: null },
    select: { cameraMake: true, cameraModel: true, iso: true, lensModel: true, focalLength: true }
  });

  const countBy = (key: string) => {
    const counts: Record<string, number> = {};
    for (const p of photos) {
      const val = (p as any)[key];
      if (val !== null && val !== undefined) {
        let strVal = String(val).trim();
        // Normalize common makes (e.g. "Apple", "Apple Computer")
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

  const result = {
    makes: countBy('cameraMake'),
    models: countBy('cameraModel'),
    isos: countBy('iso'),
    lenses: countBy('lensModel'),
    focalLengths: countBy('focalLength')
  };

  await setCache(cacheKey, result, 600); // 10 minutes cache
  return result;
}

export async function saveUploadedPhotoRecord(payload: {
  url: string;
  altText?: string;
  description?: string;
  albumId?: string;
  storyId?: string;
  tags?: string;
  exifData?: {
    dateTaken?: Date | null;
    cameraMake?: string | null;
    cameraModel?: string | null;
    lensModel?: string | null;
    focalLength?: number | null;
    fNumber?: number | null;
    iso?: number | null;
    exposureTime?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    width?: number | null;
    height?: number | null;
  }
}) {
  const session = await checkAuthServerAction();

  let locationName = null;
  if (payload.exifData?.latitude && payload.exifData?.longitude) {
    try {
      const userAgent = process.env.GEOCODING_USER_AGENT || 'MemoriesPhotosApp/1.0';
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${payload.exifData.latitude}&lon=${payload.exifData.longitude}&format=json`, {
        headers: { 'User-Agent': userAgent }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.address) {
          const city = data.address.city || data.address.town || data.address.village || data.address.county;
          const country = data.address.country;
          if (city && country) {
            locationName = `${city}, ${country}`;
          } else if (country) {
            locationName = country;
          } else {
            locationName = data.display_name;
          }
        }
      }
    } catch (e) {
      console.error("Reverse geocoding failed", e);
    }
  }

  const manualTags = payload.tags || "";
  let parsedTags: string[] = [];
  if (manualTags) {
    parsedTags = manualTags.split(",").map(t => t.trim()).filter(t => t);
  }

  const tagConnectOrCreate = parsedTags.map((tag) => ({
    where: { name: tag },
    create: { name: tag },
  }));

  const photo = await prisma.photo.create({
    data: {
      url: payload.url,
      altText: payload.altText || "Uploaded photo",
      description: payload.description || "",
      albumId: payload.albumId || null,
      storyId: payload.storyId || null,
      dateTaken: payload.exifData?.dateTaken || null,
      userId: session.userId,
      cameraMake: payload.exifData?.cameraMake || null,
      cameraModel: payload.exifData?.cameraModel || null,
      lensModel: payload.exifData?.lensModel || null,
      focalLength: payload.exifData?.focalLength || null,
      fNumber: payload.exifData?.fNumber || null,
      iso: payload.exifData?.iso || null,
      exposureTime: payload.exifData?.exposureTime || null,
      latitude: payload.exifData?.latitude || null,
      longitude: payload.exifData?.longitude || null,
      locationName: locationName,
      tags: {
        connectOrCreate: tagConnectOrCreate,
      },
      isPublic: true,
    },
  });

  await clearUserCache(session.userId);
  revalidatePath("/", "layout");
  revalidatePath("/albums", "layout");
  if (payload.albumId) {
    revalidatePath(`/albums/${payload.albumId}`, "layout");
  }

  // Trigger background sync and cleanup if it was saved locally
  if (photo.url && photo.url.startsWith("/uploads/")) {
    syncLocalPhotoToCloud(photo.id, photo.url).catch((err) => {
      console.warn("Background cloud sync failed for upload:", err);
    });
  }

  return photo;
}

