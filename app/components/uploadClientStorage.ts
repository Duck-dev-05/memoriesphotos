"use client";

import { uploadFileLocally } from "@/app/actions";

type CloudSignBody = {
  shareToken?: string;
};

const DEFAULT_LOCAL_UPLOAD_LIMIT_BYTES = 25 * 1024 * 1024;

function isHeicFile(file: File): boolean {
  return file.type === 'image/heic' ||
         file.type === 'image/heif' ||
         file.name.toLowerCase().endsWith('.heic') ||
         file.name.toLowerCase().endsWith('.heif');
}

function getLocalUploadLimitBytes() {
  const configuredMb = Number(process.env.NEXT_PUBLIC_LOCAL_UPLOAD_LIMIT_MB);
  return Number.isFinite(configuredMb) && configuredMb > 0
    ? configuredMb * 1024 * 1024
    : DEFAULT_LOCAL_UPLOAD_LIMIT_BYTES;
}

function getOptimizedCloudinaryUrl(url: string, file: File) {
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) {
    return url;
  }

  const isVideo = file.type.startsWith("video/");
  const params = isVideo
    ? "f_auto,q_auto,vc_auto,c_limit,w_1920"
    : "f_auto,q_auto,c_limit,w_2560";

  return url.replace("/upload/", `/upload/${params}/`);
}

async function uploadFileToCloud(file: File, signBody?: CloudSignBody): Promise<string> {
  const signRes = await fetch("/api/cloudinary/sign", {
    method: "POST",
    headers: signBody ? { "Content-Type": "application/json" } : undefined,
    body: signBody ? JSON.stringify(signBody) : undefined,
  });

  if (!signRes.ok) {
    throw new Error("Failed to get Cloudinary signature");
  }

  const { timestamp, signature, cloudName, apiKey } = await signRes.json();
  const uploadData = new FormData();
  uploadData.append("file", file);
  uploadData.append("api_key", apiKey);
  uploadData.append("timestamp", timestamp.toString());
  uploadData.append("signature", signature);
  uploadData.append("folder", "memoriesphotos");

  const cldRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
    method: "POST",
    body: uploadData,
  });

  if (cldRes.ok) {
    const cloudinaryData = await cldRes.json();
    return getOptimizedCloudinaryUrl(cloudinaryData.secure_url, file);
  }

  // Fall back to ImgBB for all files including HEIC
  const imgbbApiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY;
  if (!imgbbApiKey || !file.type.startsWith("image/")) {
    throw new Error("Cloud upload failed");
  }

  const imgbbFormData = new FormData();
  imgbbFormData.append("image", file);
  const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
    method: "POST",
    body: imgbbFormData,
  });

  if (!imgbbRes.ok) {
    throw new Error("Cloud fallback upload failed");
  }

  const imgbbData = await imgbbRes.json();
  return imgbbData.data.url;
}

export async function uploadFileLocalFirst(file: File, signBody?: CloudSignBody) {
  const localUploadLimitBytes = getLocalUploadLimitBytes();

  if (file.size <= localUploadLimitBytes) {
    try {
      const localFormData = new FormData();
      localFormData.append("file", file);
      const localUrl = await uploadFileLocally(localFormData);

      uploadFileToCloud(file, signBody).catch((error) => {
        console.warn("Background cloud upload failed", error);
      });

      return localUrl;
    } catch (error) {
      console.warn("Local upload failed, falling back to cloud storage", error);
    }
  }

  try {
    return await uploadFileToCloud(file, signBody);
  } catch (error) {
    console.warn("Cloud upload failed", error);
  }

  throw new Error("Upload failed. Local storage limit was reached and cloud upload is unavailable.");
}
