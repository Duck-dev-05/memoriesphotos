"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import fs from "fs/promises";
import path from "path";
import exifr from "exifr";
import bcrypt from "bcryptjs";
import { checkAuthServerAction, createSessionCookie, deleteSessionCookie, getSession } from "@/lib/auth";
import { uploadBufferToCloud, saveUploadedFileBufferLocally } from "./auth";
import { v2 as cloudinary } from "cloudinary";
import type { UploadApiResponse } from "cloudinary";
import { getCache, setCache, invalidatePattern, clearUserCache } from "@/lib/redis";


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});






export async function createAlbum(formData: FormData) {
  const session = await checkAuthServerAction();
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const parentIdRaw = formData.get("parentId") as string;

  if (!name) throw new Error("Name is required");

  // Ensure an empty / whitespace-only parentId never hits the FK constraint
  const parentId = parentIdRaw?.trim() || null;

  // If a parentId was provided, verify it actually exists and belongs to this user
  if (parentId) {
    const parent = await prisma.album.findUnique({ where: { id: parentId } });
    if (!parent || parent.userId !== session.userId) {
      throw new Error("Parent album not found");
    }
  }

  let coverImageUrl = formData.get("coverImageUrl") as string | null;

  if (!coverImageUrl) {
    const coverFile = formData.get("coverImage") as File | null;
    if (coverFile && coverFile.size > 0) {
      const buffer = Buffer.from(await coverFile.arrayBuffer());
      // Try cloud upload first for cover images to avoid local storage issues
      const cloudUrl = await uploadBufferToCloud(buffer, coverFile.name, coverFile.type);
      if (cloudUrl) {
        coverImageUrl = cloudUrl;
      } else {
        // Fallback to local storage
        coverImageUrl = await saveUploadedFileBufferLocally(buffer, coverFile, "cover");
      }
    }
  }

  const album = await prisma.album.create({
    data: {
      name,
      description,
      parentId,
      userId: session.userId,
      coverImage: coverImageUrl,
    },
  });

  await clearUserCache(session.userId);
  revalidatePath("/albums", "layout");
  revalidatePath("/", "layout");
  
  return album;
}

export async function updateAlbum(id: string, formData: FormData) {
  const session = await checkAuthServerAction();
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;

  if (!name) throw new Error("Name is required");

  const album = await prisma.album.findUnique({ where: { id } });
  if (!album || album.userId !== session.userId) throw new Error("Unauthorized");

  const coverFile = formData.get("coverImage") as File | null;
  let coverImageUrl = album.coverImage;

  if (coverFile && coverFile.size > 0) {
    const buffer = Buffer.from(await coverFile.arrayBuffer());
    // Try cloud upload first for cover images to avoid local storage issues
    const cloudUrl = await uploadBufferToCloud(buffer, coverFile.name, coverFile.type);
    if (cloudUrl) {
      coverImageUrl = cloudUrl;
    } else {
      // Fallback to local storage
      coverImageUrl = await saveUploadedFileBufferLocally(buffer, coverFile, "cover");
    }
  }

  const isLockedStr = formData.get("isLocked") as string;
  const isLocked = isLockedStr === "true";
  const lockPasscode = formData.get("lockPasscode") as string | null;

  const dataToUpdate: any = { name, description, coverImage: coverImageUrl, isLocked };
  if (lockPasscode !== null) {
    dataToUpdate.lockPasscode = lockPasscode;
  }

  await prisma.album.update({
    where: { id },
    data: dataToUpdate,
  });

  await clearUserCache(session.userId);
  revalidatePath("/albums", "layout");
  revalidatePath(`/albums/${id}`, "layout");
}

export async function deleteAlbum(id: string) {
  const session = await checkAuthServerAction();

  const album = await prisma.album.findUnique({ where: { id } });
  if (!album || album.userId !== session.userId) throw new Error("Unauthorized");

  await prisma.album.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await clearUserCache(session.userId);
  revalidatePath("/albums", "layout");
  revalidatePath("/", "layout");
}

export async function restoreAlbum(id: string) {
  const session = await checkAuthServerAction();

  const album = await prisma.album.findUnique({ where: { id } });
  if (!album || album.userId !== session.userId) throw new Error("Unauthorized");

  await prisma.album.update({
    where: { id },
    data: { deletedAt: null },
  });

  await clearUserCache(session.userId);
  revalidatePath("/albums", "layout");
  revalidatePath("/", "layout");
  revalidatePath("/trash", "layout");
}

export async function hardDeleteAlbum(id: string) {
  const session = await checkAuthServerAction();

  const album = await prisma.album.findUnique({ where: { id } });
  if (!album || album.userId !== session.userId) throw new Error("Unauthorized");

  await prisma.album.delete({
    where: { id },
  });

  await clearUserCache(session.userId);
  revalidatePath("/trash", "layout");
}

export async function getTotalPhotosCount() {
  const session = await getSession();
  if (!session) return 0;

  const cacheKey = `user:${session.userId}:totalPhotos`;
  const cached = await getCache<number>(cacheKey);
  if (cached !== null) return cached;

  const count = await prisma.photo.count({
    where: {
      userId: session.userId,
      deletedAt: null,
      OR: [
        { albumId: null },
        { album: { deletedAt: null } }
      ]
    },
  });

  await setCache(cacheKey, count);
  return count;
}

export async function getAlbums() {
  const session = await getSession();
  if (!session) return [];

  const cacheKey = `user:${session.userId}:albums`;
  const cached = await getCache<any>(cacheKey);
  if (cached) return cached;

  const albums = await prisma.album.findMany({
    where: { userId: session.userId, parentId: null, deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      photos: {
        where: { deletedAt: null },
        take: 1,
        orderBy: { createdAt: "desc" },
      },
      _count: {
        select: { photos: { where: { deletedAt: null } } },
      },
      children: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { photos: { where: { deletedAt: null } } },
          },
          photos: { where: { deletedAt: null }, take: 1 }
        }
      }
    },
  });

  await setCache(cacheKey, albums);
  return albums;
}

export async function getAlbum(id: string) {
  const session = await getSession();

  const cacheKey = session ? `user:${session.userId}:album:${id}` : `public:album:${id}`;
  const cached = await getCache<any>(cacheKey);
  if (cached) return cached;

  const album = await prisma.album.findUnique({
    where: { id },
    include: {
      photos: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        include: { tags: true },
      },
      children: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        include: {
          photos: {
            where: { deletedAt: null },
            take: 1,
            orderBy: { createdAt: "desc" },
            include: { tags: true },
          },
          _count: {
            select: { photos: { where: { deletedAt: null } } },
          },
        },
      },
    },
  });

  if (!album || album.deletedAt) return null;

  let hasAccess = false;

  // 1. Owner
  if (session && album.userId === session.userId) {
    hasAccess = true;
  }
  
  // 2. Publicly shared
  if (!hasAccess && album.isPublic) {
    hasAccess = true;
  }

  // 3. Explicitly invited via AlbumShare
  if (!hasAccess && session) {
    const share = await prisma.albumShare.findUnique({
      where: { albumId_userId: { albumId: id, userId: session.userId } }
    });
    if (share) hasAccess = true;
  }

  if (!hasAccess) return null;

  // 4. Check lock
  if (album.isLocked) {
    const cookieStore = await cookies();
    const unlockedStr = cookieStore.get("unlocked_albums")?.value || "[]";
    let unlockedList = [];
    try { unlockedList = JSON.parse(unlockedStr); } catch(e) {}
    
    if (!unlockedList.includes(album.id)) {
      // Return a stripped-down version of the album (no photos, no children) indicating it is locked
      return {
        id: album.id,
        name: album.name,
        isLocked: true,
        needsUnlock: true,
        userId: album.userId,
        isPublic: album.isPublic,
        coverImage: album.coverImage
      };
    }
  }

  await setCache(cacheKey, album);
  return album;
}

export async function unlockAlbumAction(id: string, passcode: string) {
  const album = await prisma.album.findUnique({
    where: { id },
    select: { isLocked: true, lockPasscode: true }
  });

  if (!album) return { success: false, error: "Album not found" };
  if (!album.isLocked) return { success: true };
  if (album.lockPasscode && album.lockPasscode !== passcode) {
    return { success: false, error: "Incorrect passcode" };
  }

  const cookieStore = await cookies();
  const unlockedStr = cookieStore.get("unlocked_albums")?.value || "[]";
  let unlockedList = [];
  try { unlockedList = JSON.parse(unlockedStr); } catch(e) {}
  
  if (!unlockedList.includes(id)) {
    unlockedList.push(id);
    cookieStore.set("unlocked_albums", JSON.stringify(unlockedList), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 // 1 day
    });
  }

  return { success: true };
}

