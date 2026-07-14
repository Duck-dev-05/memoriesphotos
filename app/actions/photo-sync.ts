import { prisma } from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function getOptimizedCloudinaryUrl(url: string, isVideo: boolean): string {
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) {
    return url;
  }
  const params = isVideo
    ? "f_auto,q_auto,vc_auto,c_limit,w_1920"
    : "f_auto,q_auto,c_limit,w_2560";
  return url.replace("/upload/", `/upload/${params}/`);
}

import sharp from "sharp";

export async function syncLocalPhotoToCloud(photoId: string, localUrl: string) {
  try {
    if (!localUrl.startsWith("/uploads/")) {
      return;
    }

    const filePath = path.join(process.cwd(), "public", localUrl);
    
    // Check if file exists before proceeding
    try {
      await fs.access(filePath);
    } catch {
      console.warn(`File ${filePath} not found for sync.`);
      return;
    }

    const fileBuffer = await fs.readFile(filePath);

    // Upload to Cloudinary
    const filename = path.basename(localUrl);
    const ext = path.extname(filename).toLowerCase();
    const isVideo = [".mp4", ".mov", ".avi", ".webm", ".mkv"].includes(ext);

    // Try Cloudinary first
    let finalUrl = "";
    const hasCloudinaryConfig =
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET;

    if (hasCloudinaryConfig) {
        const uploadResult = await new Promise<any>((resolve, reject) => {
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
          uploadStream.end(fileBuffer);
        });

        finalUrl = getOptimizedCloudinaryUrl(uploadResult.secure_url, isVideo);
    } else {
        // Fallback to ImgBB
        const imgbbApiKey = process.env.IMGBB_API_KEY || process.env.NEXT_PUBLIC_IMGBB_API_KEY;
        if (imgbbApiKey && !isVideo) {
            const base64Image = fileBuffer.toString('base64');
            const formData = new FormData();
            formData.append('image', base64Image);

            const res = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
                method: 'POST',
                body: formData,
            });

            if (res.ok) {
                const data = await res.json();
                if (data.data?.url) {
                    finalUrl = data.data.url;
                }
            }
        }
    }

    if (!finalUrl) {
        throw new Error("No configured cloud provider could upload the file.");
    }

    // Update database with cloudUrl
    await prisma.photo.update({
      where: { id: photoId },
      data: { cloudUrl: finalUrl },
    });

    if (isVideo) {
      // For videos, Next.js can just load from Cloudinary directly.
      // Set url to the cloud url and delete local file completely.
      await prisma.photo.update({
        where: { id: photoId },
        data: { url: finalUrl },
      });
      await fs.unlink(filePath);
      console.log(`Successfully synced video to cloud and deleted local file: ${localUrl}`);
    } else {
      // For images, generate highly compressed local WebP thumbnail
      const thumbnailPath = filePath.replace(ext, ".webp");
      const newLocalUrl = localUrl.replace(ext, ".webp");
      
      await sharp(fileBuffer)
        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 60 })
        .toFile(thumbnailPath);

      if (thumbnailPath !== filePath) {
        await fs.unlink(filePath); // delete original large file
      }

      await prisma.photo.update({
        where: { id: photoId },
        data: { url: newLocalUrl },
      });
      console.log(`Successfully synced image to cloud and created local compressed thumbnail: ${newLocalUrl}`);
    }

  } catch (error) {
    console.error(`Background sync failed for ${localUrl}:`, error);
  }
}
