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


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});



export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) return { error: "Email và mật khẩu là bắt buộc" };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) return { error: "Thông tin đăng nhập không hợp lệ" };

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) return { error: "Thông tin đăng nhập không hợp lệ" };

  await createSessionCookie({
    userId: user.id,
    email: user.email,
    name: user.name,
  });

  return { success: true };
}

export async function register(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!name || !email || !password) return { error: "Vui lòng điền đầy đủ thông tin" };
  if (password !== confirmPassword) return { error: "Mật khẩu không khớp" };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "Email này đã được đăng ký" };

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { name, email, passwordHash },
  });

  await createSessionCookie({
    userId: user.id,
    email: user.email,
    name: user.name,
  });

  return { success: true };
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

  const totalBytes = photos.reduce((sum: number, photo: { fileSize: number | null }) => sum + (photo.fileSize || 0), 0);
  return totalBytes;
}

export async function getStorageInfo() {
  const session = await getSession();
  if (!session) return { usage: 0, limit: 0 };

  const usage = await getStorageUsage();
  const limit = await getUserStorageLimitBytes();

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

export async function getVideoSizeLimitBytes() {
  const configuredMb = Number(process.env.VIDEO_SIZE_LIMIT_MB || process.env.NEXT_PUBLIC_VIDEO_SIZE_LIMIT_MB);
  return Number.isFinite(configuredMb) && configuredMb > 0
    ? configuredMb * 1024 * 1024
    : 500 * 1024 * 1024;
}

export async function getUserStorageLimitBytes() {
  const configuredGb = Number(process.env.USER_STORAGE_LIMIT_GB || process.env.NEXT_PUBLIC_USER_STORAGE_LIMIT_GB);
  return Number.isFinite(configuredGb) && configuredGb > 0
    ? configuredGb * 1024 * 1024 * 1024
    : 10 * 1024 * 1024 * 1024;
}

export async function isVideoFile(file: File) {
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

export async function saveUploadedFileBufferLocally(buffer: Buffer, file: File, filenameBase = ""): Promise<string> {
  const ext = file.name.split('.').pop() || 'tmp';
  const prefix = filenameBase ? `${filenameBase}-` : "";
  const filename = `${prefix}${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
  return saveBufferToWritableStorage(buffer, filename, file.type);
}

export async function uploadBufferToCloud(buffer: Buffer, filename: string, contentType?: string): Promise<string | null> {
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

