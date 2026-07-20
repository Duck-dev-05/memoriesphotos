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
import { syncLocalPhotoToCloud } from "./photo-sync";
import { isVideoFile, getVideoSizeLimitBytes, getUserStorageLimitBytes, getStorageUsage, saveUploadedFileBufferLocally } from "./auth";
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});



export async function uploadPhoto(formData: FormData) {
  const session = await checkAuthServerAction();
  const file = formData.get("file") as File;
  const altText = formData.get("altText") as string;
  const description = formData.get("description") as string;
  const albumId = formData.get("albumId") as string;

  if (!file) throw new Error("File is required");

  const buffer = Buffer.from(await file.arrayBuffer());
  const isVideo = await isVideoFile(file);
  const fileSize = buffer.length;

  // Check video size limit
  if (isVideo) {
    const videoSizeLimit = await getVideoSizeLimitBytes();
    if (fileSize > videoSizeLimit) {
      const limitMB = videoSizeLimit / (1024 * 1024);
      throw new Error(`Video size exceeds the limit of ${limitMB}MB`);
    }
  }

  // Check user storage limit
  const currentStorageUsage = await getStorageUsage();
  const storageLimit = await getUserStorageLimitBytes();
  if (currentStorageUsage + fileSize > storageLimit) {
    const limitGB = storageLimit / (1024 * 1024 * 1024);
    const usedGB = currentStorageUsage / (1024 * 1024 * 1024);
    throw new Error(`Storage limit exceeded. You have used ${usedGB.toFixed(2)}GB out of ${limitGB}GB limit`);
  }

  const uploadUrl = await saveUploadedFileBufferLocally(buffer, file);

  let dateTaken = null;
  let exifDetails: any = {};

  if (!isVideo) {
    try {
      // Parse detailed EXIF data for the Info Sidebar and Search
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

        exifDetails = {
          cameraMake: (exifData.Make || exifData.make) ? String(exifData.Make || exifData.make).trim() : null,
          cameraModel: (exifData.Model || exifData.model) ? String(exifData.Model || exifData.model).trim() : null,
          lensModel: (exifData.LensModel || exifData.Lens || exifData.lens) ? String(exifData.LensModel || exifData.Lens || exifData.lens).trim() : null,
          focalLength: (exifData.FocalLength || exifData.focalLength) ? Number(exifData.FocalLength || exifData.focalLength) : null,
          fNumber: (exifData.FNumber || exifData.fNumber || exifData.ApertureValue) ? Number(exifData.FNumber || exifData.fNumber || exifData.ApertureValue) : null,
          iso: (exifData.ISO || exifData.iso) ? Number(exifData.ISO || exifData.iso) : null,
          exposureTime: (exifData.ExposureTime || exifData.exposureTime)
            ? ((exifData.ExposureTime || exifData.exposureTime) < 1 ? `1/${Math.round(1 / (exifData.ExposureTime || exifData.exposureTime))}` : String(exifData.ExposureTime || exifData.exposureTime))
            : null,
          latitude: exifData.latitude ? Number(exifData.latitude) : null,
          longitude: exifData.longitude ? Number(exifData.longitude) : null,
          width: (exifData.ImageWidth || exifData.ExifImageWidth) ? Number(exifData.ImageWidth || exifData.ExifImageWidth) : null,
          height: (exifData.ImageHeight || exifData.ExifImageHeight) ? Number(exifData.ImageHeight || exifData.ExifImageHeight) : null,
        };
      }
    } catch (error) {
      console.error("Failed to parse EXIF:", error);
    }
  }

  let locationName = null;
  if (exifDetails.latitude && exifDetails.longitude) {
    try {
      const userAgent = process.env.GEOCODING_USER_AGENT || 'MemoriesPhotosApp/1.0';
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${exifDetails.latitude}&lon=${exifDetails.longitude}&format=json`, {
        headers: {
          'User-Agent': userAgent
        }
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

  const manualTags = formData.get("tags") as string;
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
      url: uploadUrl,
      altText: altText || "Uploaded photo",
      description,
      albumId: albumId || null,
      dateTaken,
      userId: session.userId,
      fileSize,
      cameraMake: exifDetails.cameraMake,
      cameraModel: exifDetails.cameraModel,
      lensModel: exifDetails.lensModel,
      focalLength: exifDetails.focalLength,
      fNumber: exifDetails.fNumber,
      iso: exifDetails.iso,
      exposureTime: exifDetails.exposureTime,
      latitude: exifDetails.latitude,
      longitude: exifDetails.longitude,
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
  if (albumId) revalidatePath(`/albums/${albumId}`, "layout");

  if (photo.url && photo.url.startsWith("/uploads/")) {
    syncLocalPhotoToCloud(photo.id, photo.url).catch(console.error);
  }
}

export async function updatePhoto(id: string, formData: FormData) {
  const session = await checkAuthServerAction();
  const altText = formData.get("altText") as string;
  const description = formData.get("description") as string;
  const albumId = formData.get("albumId") as string;
  const manualTags = formData.get("tags") as string;

  if (!altText) throw new Error("Title is required");

  const photoCheck = await prisma.photo.findUnique({ where: { id } });
  if (!photoCheck || photoCheck.userId !== session.userId) throw new Error("Unauthorized");

  let parsedTags: string[] = [];
  if (manualTags) {
    parsedTags = manualTags.split(",").map(t => t.trim()).filter(t => t);
  }

  const tagConnectOrCreate = parsedTags.map((tag) => ({
    where: { name: tag },
    create: { name: tag },
  }));

  const photo = await prisma.photo.update({
    where: { id },
    data: {
      altText,
      description,
      albumId: albumId || null,
      tags: {
        set: [],
        connectOrCreate: tagConnectOrCreate,
      }
    },
  });

  await clearUserCache(session.userId);
  revalidatePath("/", "layout");
  revalidatePath(`/photo/${id}`, "layout");
  if (photo.albumId) revalidatePath(`/albums/${photo.albumId}`, "layout");
}

export async function deletePhoto(id: string) {
  const session = await checkAuthServerAction();

  const photoCheck = await prisma.photo.findUnique({ where: { id } });
  if (!photoCheck || photoCheck.userId !== session.userId) throw new Error("Unauthorized");

  await prisma.photo.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await clearUserCache(session.userId);
  revalidatePath("/", "layout");
  revalidatePath("/albums", "layout");
  if (photoCheck.albumId) revalidatePath(`/albums/${photoCheck.albumId}`, "layout");
}

export async function deletePhotosBulk(ids: string[]) {
  const session = await checkAuthServerAction();

  const photosCheck = await prisma.photo.findMany({
    where: {
      id: { in: ids },
      userId: session.userId
    }
  });

  if (photosCheck.length === 0) return;

  await prisma.photo.updateMany({
    where: {
      id: { in: photosCheck.map((p: { id: string }) => p.id) }
    },
    data: { deletedAt: new Date() },
  });

  await clearUserCache(session.userId);
  revalidatePath("/", "layout");
  revalidatePath("/albums", "layout");
  revalidatePath("/trash", "layout");

  const albumIds = new Set(photosCheck.map((p: { albumId: string | null }) => p.albumId).filter(Boolean));
  albumIds.forEach(id => revalidatePath(`/albums/${id}`, "layout"));
}

export async function restorePhoto(id: string) {
  const session = await checkAuthServerAction();

  const photo = await prisma.photo.findUnique({ where: { id } });
  if (!photo || photo.userId !== session.userId) throw new Error("Unauthorized");

  await prisma.photo.update({
    where: { id },
    data: { deletedAt: null },
  });

  await clearUserCache(session.userId);
  revalidatePath("/", "layout");
  revalidatePath("/albums", "layout");
  revalidatePath("/trash", "layout");
  if (photo.albumId) revalidatePath(`/albums/${photo.albumId}`, "layout");
}

export async function hardDeletePhoto(id: string) {
  const session = await checkAuthServerAction();

  const photoCheck = await prisma.photo.findUnique({ where: { id } });
  if (!photoCheck || photoCheck.userId !== session.userId) throw new Error("Unauthorized");

  const photo = await prisma.photo.delete({
    where: { id },
  });

  try {
    if (photo.url && photo.url.includes("cloudinary.com")) {
      const parts = photo.url.split("/");
      const filename = parts[parts.length - 1];
      const folder = parts[parts.length - 2];
      const publicId = `${folder}/${filename.split(".")[0]}`;
      await cloudinary.uploader.destroy(publicId);
    } else if (photo.url && photo.url.includes("ibb.co")) {
      // ImgBB does not support deleting by URL, so we do nothing to keep it simple.
      console.log("Skipping ImgBB deletion as it is unsupported via URL");
    } else if (photo.url && photo.url.startsWith("/uploads/")) {
      const filePath = path.join(process.cwd(), "public", photo.url);
      await fs.unlink(filePath);
    }
  } catch (err) {
    console.error("Failed to delete file from disk/cloudinary", err);
  }

  await clearUserCache(session.userId);
  revalidatePath("/trash", "layout");
}

export async function saveEditedPhoto(id: string, formData: FormData) {
  const session = await checkAuthServerAction();
  const file = formData.get("file") as File;

  if (!file) throw new Error("File is required");

  const photoCheck = await prisma.photo.findUnique({ where: { id } });
  if (!photoCheck || photoCheck.userId !== session.userId) throw new Error("Unauthorized");

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileSize = buffer.length;

  const uploadUrl = await saveUploadedFileBufferLocally(buffer, file, "edited");

  const photo = await prisma.photo.update({
    where: { id },
    data: {
      url: uploadUrl,
      fileSize: fileSize,
    },
  });

  await clearUserCache(session.userId);
  revalidatePath("/", "layout");
  revalidatePath(`/photo/${id}`, "layout");
  if (photo.albumId) revalidatePath(`/albums/${photo.albumId}`, "layout");

  if (photo.url && photo.url.startsWith("/uploads/")) {
    syncLocalPhotoToCloud(photo.id, photo.url).catch(console.error);
  }
}


export async function toggleFavorite(id: string, isFavorite: boolean) {
  const session = await checkAuthServerAction();

  const photoCheck = await prisma.photo.findUnique({ where: { id } });
  if (!photoCheck || photoCheck.userId !== session.userId) throw new Error("Unauthorized");

  const photo = await prisma.photo.update({
    where: { id },
    data: { isFavorite },
  });

  await clearUserCache(session.userId);
  revalidatePath("/", "layout");
  revalidatePath("/favorites", "layout");
  revalidatePath(`/photo/${id}`, "layout");
  if (photo.albumId) revalidatePath(`/albums/${photo.albumId}`, "layout");
}

export async function getHomepagePhotos() {
  const session = await getSession();
  if (!session) return { heroPhotos: [], marqueePhotos: [], randomPhoto: null, favoritesCount: 0 };

  const cacheKey = `user:${session.userId}:homepagePhotos`;
  const cached = await getCache<any>(cacheKey);
  if (cached) return cached;

  const [recentPhotos, favoritesCount] = await Promise.all([
    prisma.photo.findMany({
      where: { userId: session.userId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.photo.count({
      where: { userId: session.userId, deletedAt: null, isFavorite: true },
    })
  ]);

  // Ensure we have exactly 4 random photos if possible (or however many we have up to 4)
  const heroPhotos = [...recentPhotos].sort(() => 0.5 - Math.random()).slice(0, 4);
  const marqueePhotos = recentPhotos.slice(0, 10);
  const randomPhoto = recentPhotos.length > 0 ? recentPhotos[Math.floor(Math.random() * recentPhotos.length)] : null;

  const data = { heroPhotos, marqueePhotos, randomPhoto, favoritesCount };
  await setCache(cacheKey, data);
  return data;
}

export async function getPhotos(albumId?: string) {
  const session = await getSession();
  if (!session) return [];

  const cacheKey = `user:${session.userId}:photos:${albumId || 'all'}`;
  const cached = await getCache<any>(cacheKey);
  if (cached) return cached;

  const photos = await prisma.photo.findMany({
    where: {
      userId: session.userId,
      deletedAt: null,
      OR: [
        { albumId: null },
        { album: { deletedAt: null } }
      ],
      ...(albumId ? { albumId } : {})
    },
    orderBy: { createdAt: "desc" },
    include: {
      album: true,
      tags: true,
    },
  });

  await setCache(cacheKey, photos);
  return photos;
}

export async function getPhoto(id: string) {
  const session = await getSession();

  const cacheKey = session ? `user:${session.userId}:photo:${id}` : `public:photo:${id}`;
  const cached = await getCache<any>(cacheKey);
  if (cached) return cached;

  const photo = await prisma.photo.findUnique({
    where: { id },
    include: {
      album: true,
      tags: true,
    },
  });

  if (!photo || photo.deletedAt) return null;

  let hasAccess = false;

  // 1. Owner
  if (session && photo.userId === session.userId) {
    hasAccess = true;
  }

  // 2. Photo itself is public
  if (!hasAccess && photo.isPublic) {
    hasAccess = true;
  }

  // 3. Belonging to a public album
  if (!hasAccess && photo.album?.isPublic) {
    hasAccess = true;
  }

  // 4. Belonging to an explicitly shared album
  if (!hasAccess && session && photo.albumId) {
    const share = await prisma.albumShare.findUnique({
      where: { albumId_userId: { albumId: photo.albumId, userId: session.userId } }
    });
    if (share) hasAccess = true;
  }

  if (!hasAccess) return null;

  await setCache(cacheKey, photo);
  return photo;
}

export async function getPublicPhoto(id: string, token: string) {
  if (!token) return null;
  const photo = await prisma.photo.findUnique({
    where: { id },
    include: {
      album: {
        include: { parent: true }
      },
      tags: true,
    },
  });

  if (!photo || photo.deletedAt) return null;

  // Check if the photo belongs to the shared album, or if its parent is the shared album
  const isSharedDirectly = photo.album && photo.album.shareToken === token && photo.album.isPublic;
  const isSharedViaParent = photo.album && photo.album.parent && photo.album.parent.shareToken === token && photo.album.parent.isPublic;
  const isPhotoShared = photo.isPublic && photo.shareToken === token;

  if (isSharedDirectly || isSharedViaParent || isPhotoShared) {
    return photo;
  }

  return null;
}

export async function getFavorites() {
  const session = await getSession();
  if (!session) return [];

  const cacheKey = `user:${session.userId}:favorites`;
  const cached = await getCache<any>(cacheKey);
  if (cached) return cached;

  const favorites = await prisma.photo.findMany({
    where: {
      userId: session.userId,
      isFavorite: true,
      deletedAt: null,
      OR: [
        { albumId: null },
        { album: { deletedAt: null } }
      ]
    },
    orderBy: { createdAt: "desc" },
    include: {
      album: true,
      tags: true,
    },
  });

  await setCache(cacheKey, favorites);
  return favorites;
}

export async function searchPhotos(
  query: string,
  filters?: {
    cameraMake?: string,
    cameraModel?: string,
    lensModel?: string,
    iso?: number,
    focalLength?: number,
    fNumber?: number,
    exposureTime?: string,
    dateStart?: Date,
    dateEnd?: Date,
    albumId?: string,
    isFavorite?: boolean,
  }
) {
  const session = await getSession();
  if (!session) return [];

  const whereClause: any = {
    userId: session.userId,
    deletedAt: null,
  };

  // Organization Filters
  if (filters?.albumId) {
    whereClause.albumId = filters.albumId;
  } else {
    // Only search photos that aren't deleted via their album
    whereClause.OR = [
      { albumId: null },
      { album: { deletedAt: null } }
    ];
  }

  if (filters?.isFavorite) {
    whereClause.isFavorite = true;
  }

  if (!whereClause.AND) whereClause.AND = [];

  if (query) {
    whereClause.AND.push({
      OR: [
        { altText: { contains: query } },
        { description: { contains: query } },
        { album: { name: { contains: query } } },
        { tags: { some: { name: { contains: query } } } },
        { locationName: { contains: query } },
      ]
    });
  }

  // EXIF Filters
  if (filters?.cameraMake) whereClause.cameraMake = filters.cameraMake;
  if (filters?.cameraModel) whereClause.cameraModel = filters.cameraModel;
  if (filters?.lensModel) whereClause.lensModel = filters.lensModel;
  if (filters?.iso) whereClause.iso = filters.iso;
  if (filters?.focalLength) whereClause.focalLength = filters.focalLength;
  if (filters?.fNumber) whereClause.fNumber = filters.fNumber;
  if (filters?.exposureTime) whereClause.exposureTime = filters.exposureTime;

  // Date Filters
  if (filters?.dateStart || filters?.dateEnd) {
    const dateQuery: any = {};
    if (filters.dateStart) dateQuery.gte = filters.dateStart;
    if (filters.dateEnd) {
      const endOfDay = new Date(filters.dateEnd);
      endOfDay.setHours(23, 59, 59, 999);
      dateQuery.lte = endOfDay;
    }

    whereClause.AND.push({
      OR: [
        { dateTaken: dateQuery },
        { AND: [{ dateTaken: null }, { createdAt: dateQuery }] }
      ]
    });
  }

  if (whereClause.AND.length === 0) {
    delete whereClause.AND;
  }

  return await prisma.photo.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    include: {
      album: true,
      tags: true,
    },
  });
}

export async function getPhotoStats() {
  const session = await getSession();
  if (!session) return null;

  // Most used cameras
  const cameraGroups = await prisma.photo.groupBy({
    by: ['cameraMake', 'cameraModel'],
    where: { userId: session.userId, deletedAt: null, cameraModel: { not: null } },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 5
  });

  // Top focal lengths
  const focalLengthGroups = await prisma.photo.groupBy({
    by: ['focalLength'],
    where: { userId: session.userId, deletedAt: null, focalLength: { not: null } },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 5
  });

  // ISO Distribution
  const isoGroups = await prisma.photo.groupBy({
    by: ['iso'],
    where: { userId: session.userId, deletedAt: null, iso: { not: null } },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 10
  });

  return {
    topCameras: cameraGroups.map(g => ({ make: g.cameraMake, model: g.cameraModel, count: g._count.id })),
    topFocalLengths: focalLengthGroups.map(g => ({ focalLength: g.focalLength, count: g._count.id })),
    topISOs: isoGroups.map(g => ({ iso: g.iso, count: g._count.id })),
  };
}

export async function getAvailableFilters() {
  const session = await getSession();
  if (!session) return { cameraMakes: [], cameraModels: [], lensModels: [], isos: [], focalLengths: [], fNumbers: [], exposureTimes: [], albums: [] };

  const [cameraMakes, cameraModels, lensModels, isos, focalLengths, fNumbers, exposureTimes, albums] = await Promise.all([
    prisma.photo.findMany({
      where: { userId: session.userId, deletedAt: null, cameraMake: { not: null } },
      select: { cameraMake: true },
      distinct: ['cameraMake'],
    }),
    prisma.photo.findMany({
      where: { userId: session.userId, deletedAt: null, cameraModel: { not: null } },
      select: { cameraModel: true },
      distinct: ['cameraModel'],
    }),
    prisma.photo.findMany({
      where: { userId: session.userId, deletedAt: null, lensModel: { not: null } },
      select: { lensModel: true },
      distinct: ['lensModel'],
    }),
    prisma.photo.findMany({
      where: { userId: session.userId, deletedAt: null, iso: { not: null } },
      select: { iso: true },
      distinct: ['iso'],
    }),
    prisma.photo.findMany({
      where: { userId: session.userId, deletedAt: null, focalLength: { not: null } },
      select: { focalLength: true },
      distinct: ['focalLength'],
    }),
    prisma.photo.findMany({
      where: { userId: session.userId, deletedAt: null, fNumber: { not: null } },
      select: { fNumber: true },
      distinct: ['fNumber'],
    }),
    prisma.photo.findMany({
      where: { userId: session.userId, deletedAt: null, exposureTime: { not: null } },
      select: { exposureTime: true },
      distinct: ['exposureTime'],
    }),
    prisma.album.findMany({
      where: { userId: session.userId, deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    }),
  ]);

  return {
    cameraMakes: cameraMakes.map(p => p.cameraMake).filter(Boolean) as string[],
    cameraModels: cameraModels.map(p => p.cameraModel).filter(Boolean) as string[],
    lensModels: lensModels.map(p => p.lensModel).filter(Boolean) as string[],
    isos: isos.map(p => p.iso).filter(Boolean).sort((a, b) => (a as number) - (b as number)) as number[],
    focalLengths: focalLengths.map(p => p.focalLength).filter(Boolean).sort((a, b) => (a as number) - (b as number)) as number[],
    fNumbers: fNumbers.map(p => p.fNumber).filter(Boolean).sort((a, b) => (a as number) - (b as number)) as number[],
    exposureTimes: exposureTimes.map(p => p.exposureTime).filter(Boolean) as string[],
    albums: albums,
  };
}


export async function getUntaggedPhotosInAlbumTree(albumId: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  
  // Recursively fetch all photos in album and its sub-albums
  // Since Prisma doesn't do deep recursion natively, we'll fetch all albums for this user 
  // and construct the tree, then collect the photo IDs.
  
  const allAlbums = await prisma.album.findMany({
    where: { userId: session.userId, deletedAt: null },
    select: { id: true, parentId: true }
  });
  
  const targetAlbumIds = new Set<string>();
  
  // Helper to find all descendants
  const addDescendants = (parentId: string) => {
    targetAlbumIds.add(parentId);
    const children = allAlbums.filter(a => a.parentId === parentId);
    children.forEach(c => addDescendants(c.id));
  };
  
  addDescendants(albumId);
  
  // Fetch untagged photos in those albums
  const untaggedPhotos = await prisma.photo.findMany({
    where: {
      userId: session.userId,
      albumId: { in: Array.from(targetAlbumIds) },
      deletedAt: null,
      tags: { none: {} } // 0 tags
    },
    select: { id: true, url: true }
  });
  
  return untaggedPhotos;
}
