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
import { getCache, setCache, invalidatePattern } from "@/lib/redis";
import { pipeline, env } from "@xenova/transformers";

// Optional: don't load local models, fetch from HuggingFace
env.allowLocalModels = false;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ==========================================
// AUTH ACTIONS
// ==========================================

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) throw new Error("Email và mật khẩu là bắt buộc");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) throw new Error("Thông tin đăng nhập không hợp lệ");

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) throw new Error("Thông tin đăng nhập không hợp lệ");

  await createSessionCookie({
    userId: user.id,
    email: user.email,
    name: user.name,
  });
}

export async function register(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!name || !email || !password) throw new Error("Vui lòng điền đầy đủ thông tin");
  if (password !== confirmPassword) throw new Error("Mật khẩu không khớp");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("Email này đã được đăng ký");

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { name, email, passwordHash },
  });

  await createSessionCookie({
    userId: user.id,
    email: user.email,
    name: user.name,
  });
}

export async function logout() {
  await deleteSessionCookie();
  revalidatePath("/");
}

export async function updateProfile(formData: FormData) {
  const session = await checkAuthServerAction();
  const name = formData.get("name") as string;
  const avatarFile = formData.get("avatar") as File | null;

  const data: any = {};
  if (name) data.name = name;

  if (avatarFile && avatarFile.size > 0) {
    const buffer = Buffer.from(await avatarFile.arrayBuffer());
    // Upload to Cloudinary
    try {
      const uploadResult = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: "memoriesphotos" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(buffer);
      });
      data.image = uploadResult.secure_url;
    } catch (error) {
      console.warn("Cloudinary upload failed, falling back to ImgBB", error);
      data.image = await uploadToImgBB(buffer);
    }
  }

  if (Object.keys(data).length > 0) {
    await prisma.user.update({
      where: { id: session.userId },
      data,
    });
    revalidatePath("/settings");
    revalidatePath("/profile");
  }
}

export async function changePassword(formData: FormData) {
  const session = await checkAuthServerAction();
  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string;
  const confirmNewPassword = formData.get("confirmNewPassword") as string;

  if (!currentPassword || !newPassword || !confirmNewPassword) {
    throw new Error("Vui lòng điền đầy đủ thông tin");
  }

  if (newPassword !== confirmNewPassword) {
    throw new Error("Mật khẩu mới không khớp");
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || !user.passwordHash) throw new Error("Tài khoản không hợp lệ");

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) throw new Error("Mật khẩu hiện tại không đúng");

  const newPasswordHash = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: session.userId },
    data: { passwordHash: newPasswordHash },
  });

  return { success: true };
}

export async function getStorageUsage() {
  const session = await getSession();
  if (!session) return 0;

  const photos = await prisma.photo.findMany({
    where: { userId: session.userId },
    select: { fileSize: true },
  });

  const totalBytes = photos.reduce((sum, photo) => sum + (photo.fileSize || 0), 0);
  return totalBytes;
}

export async function getStorageInfo() {
  const session = await getSession();
  if (!session) return { usage: 0, limit: 0 };

  const usage = await getStorageUsage();
  const limit = getUserStorageLimitBytes();

  return { usage, limit };
}


async function ensureUploadDir() {
  const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");
  try {
    await fs.access(uploadDir);
  } catch {
    await fs.mkdir(uploadDir, { recursive: true });
  }
  return uploadDir;
}

function getLocalUploadLimitBytes() {
  const configuredMb = Number(process.env.LOCAL_UPLOAD_LIMIT_MB || process.env.NEXT_PUBLIC_LOCAL_UPLOAD_LIMIT_MB);
  return Number.isFinite(configuredMb) && configuredMb > 0
    ? configuredMb * 1024 * 1024
    : 25 * 1024 * 1024;
}

function getVideoSizeLimitBytes() {
  const configuredMb = Number(process.env.VIDEO_SIZE_LIMIT_MB || process.env.NEXT_PUBLIC_VIDEO_SIZE_LIMIT_MB);
  return Number.isFinite(configuredMb) && configuredMb > 0
    ? configuredMb * 1024 * 1024
    : 500 * 1024 * 1024;
}

function getUserStorageLimitBytes() {
  const configuredGb = Number(process.env.USER_STORAGE_LIMIT_GB || process.env.NEXT_PUBLIC_USER_STORAGE_LIMIT_GB);
  return Number.isFinite(configuredGb) && configuredGb > 0
    ? configuredGb * 1024 * 1024 * 1024
    : 10 * 1024 * 1024 * 1024;
}

function isVideoFile(file: File) {
  if (file.type.startsWith("video/")) return true;
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  return ["mp4", "mov", "avi", "webm", "mkv"].includes(ext);
}

function getOptimizedCloudinaryUrl(url: string, contentType?: string): string {
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) {
    return url;
  }

  const isVideo = contentType?.startsWith("video/");
  const params = isVideo
    ? "f_auto,q_auto,vc_auto,c_limit,w_1920"
    : "f_auto,q_auto,c_limit,w_2560";

  return url.replace("/upload/", `/upload/${params}/`);
}

function isWritableStorageError(error: unknown): error is NodeJS.ErrnoException {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    ["EROFS", "EACCES", "EPERM"].includes(String((error as NodeJS.ErrnoException).code))
  );
}

async function saveBufferLocally(buffer: Buffer, filenameBase: string): Promise<string> {
  const filename = `${filenameBase}-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
  return saveBufferToWritableStorage(buffer, filename, "image/jpeg");
}

async function saveUploadedFileBufferLocally(buffer: Buffer, file: File, filenameBase = ""): Promise<string> {
  const ext = file.name.split('.').pop() || 'tmp';
  const prefix = filenameBase ? `${filenameBase}-` : "";
  const filename = `${prefix}${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
  return saveBufferToWritableStorage(buffer, filename, file.type);
}

async function uploadBufferToCloud(buffer: Buffer, filename: string, contentType?: string): Promise<string | null> {
  // Use ImgBB first for all files including HEIC
  const apiKey = process.env.IMGBB_API_KEY || process.env.NEXT_PUBLIC_IMGBB_API_KEY;
  if (apiKey && contentType?.startsWith("image/")) {
    try {
      const base64Image = buffer.toString('base64');
      const formData = new FormData();
      formData.append('image', base64Image);

      const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json() as { data?: { url?: string } };
        if (data.data?.url) return data.data.url;
      }
    } catch (error) {
      console.warn("ImgBB upload failed", error);
    }
  }

  // Fall back to Cloudinary
  const hasCloudinaryConfig =
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET;

  if (hasCloudinaryConfig) {
    try {
      const uploadResult = await new Promise<UploadApiResponse>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "memoriesphotos",
            resource_type: "auto",
            public_id: path.parse(filename).name,
          },
          (error, result) => {
            if (error) reject(error);
            else if (result) resolve(result);
            else reject(new Error("Cloudinary upload returned no result"));
          }
        );
        uploadStream.end(buffer);
      });

      return getOptimizedCloudinaryUrl(uploadResult.secure_url, contentType);
    } catch (error) {
      console.warn("Cloudinary upload failed", error);
    }
  }

  return null;
}

async function saveBufferToWritableStorage(buffer: Buffer, filename: string, contentType?: string): Promise<string> {
  const localUploadLimitBytes = getLocalUploadLimitBytes();
  let localWriteError: unknown = null;

  if (buffer.length <= localUploadLimitBytes) {
    try {
      const uploadDir = await ensureUploadDir();
      const filePath = path.join(uploadDir, filename);
      await fs.writeFile(filePath, buffer);
      return `/uploads/${filename}`;
    } catch (error) {
      if (!isWritableStorageError(error)) {
        throw error;
      }
      localWriteError = error;
    }
  }

  const cloudUrl = await uploadBufferToCloud(buffer, filename, contentType);
  if (cloudUrl) return cloudUrl;

  if (buffer.length > localUploadLimitBytes) {
    throw new Error("Upload exceeds the local storage limit and cloud upload is unavailable");
  }

  if (localWriteError) {
    throw new Error("Upload storage is read-only and no cloud upload provider is configured");
  }

  throw new Error("Upload failed");
}

async function uploadToImgBB(buffer: Buffer): Promise<string> {
  const apiKey = process.env.IMGBB_API_KEY || process.env.NEXT_PUBLIC_IMGBB_API_KEY;
  if (!apiKey) {
    console.warn("ImgBB API Key is not configured. Falling back to local file system.");
    return await saveBufferLocally(buffer, "img");
  }

  const base64Image = buffer.toString('base64');
  const formData = new FormData();
  formData.append('image', base64Image);

  try {
    const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      console.warn("ImgBB upload failed, falling back to local file system");
      return await saveBufferLocally(buffer, "img");
    }

    const data = await res.json();
    return data.data.url;
  } catch (error) {
    console.warn("ImgBB fetch error, falling back to local file system", error);
    return await saveBufferLocally(buffer, "img");
  }
}

export async function uploadFileLocally(formData: FormData): Promise<string> {
  const file = formData.get("file") as File;
  if (!file) throw new Error("File is required");

  const buffer = Buffer.from(await file.arrayBuffer());
  return saveUploadedFileBufferLocally(buffer, file);
}

// ==========================================
// ALBUM ACTIONS
// ==========================================

async function clearUserCache(userId: string) {
  await invalidatePattern(`user:${userId}:*`);
}


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

  await prisma.album.update({
    where: { id },
    data: { name, description, coverImage: coverImageUrl },
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
  if (!session) return null;

  const cacheKey = `user:${session.userId}:album:${id}`;
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
  if (!album || album.userId !== session.userId || album.deletedAt) return null;

  await setCache(cacheKey, album);
  return album;
}

// ==========================================
// PHOTO ACTIONS
// ==========================================

export async function uploadPhoto(formData: FormData) {
  const session = await checkAuthServerAction();
  const file = formData.get("file") as File;
  const altText = formData.get("altText") as string;
  const description = formData.get("description") as string;
  const albumId = formData.get("albumId") as string;

  if (!file) throw new Error("File is required");

  const buffer = Buffer.from(await file.arrayBuffer());
  const isVideo = isVideoFile(file);
  const fileSize = buffer.length;

  // Check video size limit
  if (isVideo) {
    const videoSizeLimit = getVideoSizeLimitBytes();
    if (fileSize > videoSizeLimit) {
      const limitMB = videoSizeLimit / (1024 * 1024);
      throw new Error(`Video size exceeds the limit of ${limitMB}MB`);
    }
  }

  // Check user storage limit
  const currentStorageUsage = await getStorageUsage();
  const storageLimit = getUserStorageLimitBytes();
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

  await prisma.photo.create({
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
      id: { in: photosCheck.map(p => p.id) }
    },
    data: { deletedAt: new Date() },
  });

  await clearUserCache(session.userId);
  revalidatePath("/", "layout");
  revalidatePath("/albums", "layout");
  revalidatePath("/trash", "layout");

  const albumIds = new Set(photosCheck.map(p => p.albumId).filter(Boolean));
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
  if (!session) return null;

  const cacheKey = `user:${session.userId}:photo:${id}`;
  const cached = await getCache<any>(cacheKey);
  if (cached) return cached;

  const photo = await prisma.photo.findUnique({
    where: { id },
    include: {
      album: true,
      tags: true,
    },
  });
  if (!photo || photo.userId !== session.userId || photo.deletedAt) return null;

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

export async function scanAlbumSmartObjects(albumId: string) {
  const session = await checkAuthServerAction();

  const album = await prisma.album.findUnique({ where: { id: albumId } });
  if (!album || album.userId !== session.userId) throw new Error("Unauthorized");

  const photos = await prisma.photo.findMany({
    where: { albumId, deletedAt: null }
  });

  const cocoToVi: Record<string, string> = {
    person: "Người", bicycle: "Xe đạp", car: "Ô tô", motorcycle: "Xe máy", airplane: "Máy bay",
    bus: "Xe buýt", train: "Tàu hỏa", truck: "Xe tải", boat: "Thuyền", "traffic light": "Đèn giao thông",
    "fire hydrant": "Trụ cứu hỏa", "stop sign": "Biển báo dừng", "parking meter": "Máy tính tiền đỗ xe", bench: "Ghế đá",
    bird: "Chim", cat: "Mèo", dog: "Chó", horse: "Ngựa", sheep: "Cừu", cow: "Bò", elephant: "Voi",
    bear: "Gấu", zebra: "Ngựa vằn", giraffe: "Hươu cao cổ", backpack: "Balo", umbrella: "Ô",
    handbag: "Túi xách", tie: "Cà vạt", suitcase: "Vali", frisbee: "Đĩa bay", skis: "Ván trượt",
    snowboard: "Ván trượt tuyết", "sports ball": "Bóng thể thao", kite: "Diều", "baseball bat": "Gậy bóng chày",
    "baseball glove": "Găng tay bóng chày", skateboard: "Ván trượt", surfboard: "Ván lướt sóng", "tennis racket": "Vợt tennis",
    bottle: "Chai", "wine glass": "Ly rượu", cup: "Cốc", fork: "Nĩa", knife: "Dao", spoon: "Thìa", bowl: "Bát",
    banana: "Chuối", apple: "Táo", sandwich: "Bánh mì kẹp", orange: "Cam", broccoli: "Súp lơ", carrot: "Cà rốt",
    "hot dog": "Xúc xích", pizza: "Pizza", donut: "Bánh donut", cake: "Bánh ngọt", chair: "Ghế", couch: "Ghế sofa",
    "potted plant": "Cây cảnh", bed: "Giường", "dining table": "Bàn ăn", toilet: "Nhà vệ sinh", tv: "Tivi",
    laptop: "Laptop", mouse: "Chuột máy tính", remote: "Điều khiển từ xa", keyboard: "Bàn phím", "cell phone": "Điện thoại",
    microwave: "Lò vi sóng", oven: "Lò nướng", toaster: "Máy nướng bánh mì", sink: "Bồn rửa", refrigerator: "Tủ lạnh",
    book: "Sách", clock: "Đồng hồ", vase: "Bình hoa", scissors: "Cái kéo", "teddy bear": "Gấu bông",
    "hair drier": "Máy sấy tóc", toothbrush: "Bàn chải đánh răng"
  };

  const detector = await pipeline("object-detection", "Xenova/detr-resnet-50");

  for (const photo of photos) {
    if (!photo.url) continue;
    try {
      const output = await detector(photo.url);
      const labels = (output as any[])
        .filter((item: any) => item.score > 0.8)
        .map((item: any) => {
          const eng = item.label.toLowerCase();
          return cocoToVi[eng] || eng;
        });
      const aiTags = [...new Set(labels)] as string[];
      if (aiTags.length > 0) {
        const tagConnectOrCreate = aiTags.map((tag) => ({
          where: { name: tag },
          create: { name: tag },
        }));
        await prisma.photo.update({
          where: { id: photo.id },
          data: {
            tags: { connectOrCreate: tagConnectOrCreate }
          }
        });
      }
    } catch (e) {
      console.error(e);
    }
  }

  await clearUserCache(session.userId);
  revalidatePath(`/albums/${albumId}`, "layout");
}

// ==========================================
// TRASH & TIMELINE ACTIONS
// ==========================================

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

  // Upload guest photo and assign to the logged-in user
  await prisma.photo.create({
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

  return photo;
}

// ==========================================
// MEMORY STORIES ACTIONS
// ==========================================

export async function getMemoryStories(dayMonth: string) {
  const session = await getSession();
  if (!session) return [];

  try {
    return await (prisma as any).memoryStory.findMany({
      where: {
        userId: session.userId,
        dayMonth: dayMonth,
      },
    });
  } catch (error) {
    console.error("Error fetching memory stories:", error);
    return [];
  }
}

export async function saveMemoryStory(dayMonth: string, year: number, content: string) {
  const session = await checkAuthServerAction();

  try {
    if (!content || content.trim() === "") {
      // If empty, delete the story
      await (prisma as any).memoryStory.deleteMany({
        where: {
          userId: session.userId,
          dayMonth: dayMonth,
          year: year,
        },
      });
    } else {
      // Upsert the story
      await (prisma as any).memoryStory.upsert({
        where: {
          userId_dayMonth_year: {
            userId: session.userId,
            dayMonth: dayMonth,
            year: year,
          },
        },
        update: {
          content: content,
        },
        create: {
          userId: session.userId,
          dayMonth: dayMonth,
          year: year,
          content: content,
        },
      });
    }
  } catch (error) {
    console.error("Error saving memory story:", error);
  }

  revalidatePath("/memories");
}
