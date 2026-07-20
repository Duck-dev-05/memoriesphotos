import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { checkApiAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import exifr from "exifr";
import { syncLocalPhotoToCloud } from "@/app/actions/photo-sync";
import { isVideoFile, getVideoSizeLimitBytes, getUserStorageLimitBytes, getStorageUsage, saveUploadedFileBufferLocally } from "@/app/actions/auth";
import { clearUserCache } from "@/lib/redis";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  try {
    const session = await checkApiAuth(request);
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const altText = formData.get("altText") as string;
    const description = formData.get("description") as string;
    const albumId = formData.get("albumId") as string;

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const isVideo = await isVideoFile(file);
    const fileSize = buffer.length;

    // Check video size limit
    if (isVideo) {
      const videoSizeLimit = await getVideoSizeLimitBytes();
      if (fileSize > videoSizeLimit) {
        const limitMB = videoSizeLimit / (1024 * 1024);
        return NextResponse.json({ error: `Video size exceeds the limit of ${limitMB}MB` }, { status: 400 });
      }
    }

    // Check user storage limit
    const currentStorageUsage = await getStorageUsage();
    const storageLimit = await getUserStorageLimitBytes();
    if (currentStorageUsage + fileSize > storageLimit) {
      const limitGB = storageLimit / (1024 * 1024 * 1024);
      const usedGB = currentStorageUsage / (1024 * 1024 * 1024);
      return NextResponse.json({ error: `Storage limit exceeded. You have used ${usedGB.toFixed(2)}GB out of ${limitGB}GB limit` }, { status: 400 });
    }

    let uploadUrl = "";
    let cloudUrl: string | null = null;
    const isVercel = process.env.VERCEL || process.env.VERCEL_ENV;
    
    if (process.env.CLOUDINARY_CLOUD_NAME) {
      const uploadResult = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "memoriesphotos",
            resource_type: "auto",
            public_id: `${Date.now()}_${file.name.split('.')[0]}`,
          },
          (error, result) => {
            if (error) reject(error);
            else if (result) resolve(result);
            else reject(new Error("Cloudinary upload failed"));
          }
        );
        uploadStream.end(buffer);
      });
      uploadUrl = uploadResult.secure_url;
      cloudUrl = uploadResult.secure_url;
    } else if (isVercel && (process.env.IMGBB_API_KEY || process.env.NEXT_PUBLIC_IMGBB_API_KEY) && !isVideo) {
        const imgbbApiKey = process.env.IMGBB_API_KEY || process.env.NEXT_PUBLIC_IMGBB_API_KEY;
        const base64Image = buffer.toString('base64');
        const fd = new FormData();
        fd.append('image', base64Image);

        const res = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
            method: 'POST',
            body: fd,
        });
        if (res.ok) {
            const data = await res.json();
            if (data.data?.url) {
                uploadUrl = data.data.url;
                cloudUrl = data.data.url;
            }
        }
    }
    
    if (!uploadUrl) {
      if (isVercel) {
        return NextResponse.json({ error: "No cloud storage configured on read-only filesystem." }, { status: 500 });
      }
      uploadUrl = await saveUploadedFileBufferLocally(buffer, file);
    }

    let dateTaken = null;
    let exifDetails: any = {};

    if (!isVideo) {
      try {
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

    const manualTags = formData.get("tags") as string;
    let parsedTags: string[] = [];
    if (manualTags) {
      parsedTags = manualTags.split(",").map(t => t.trim()).filter(t => t);
    }

    // Auto-tagging with Metadata
    if (!isVideo) {
      try {
        const metadataTags = new Set<string>();

        // 1. Camera Make & Model
        if (exifDetails.cameraMake) metadataTags.add(exifDetails.cameraMake.toLowerCase().trim());
        if (exifDetails.cameraModel) metadataTags.add(exifDetails.cameraModel.toLowerCase().trim());

        // 2. Location
        if (locationName) {
          const parts = locationName.split(",").map(p => p.trim().toLowerCase());
          parts.forEach(p => { if (p) metadataTags.add(p); });
        }

        // 3. Date Taken
        if (dateTaken) {
          const date = new Date(dateTaken);
          const year = date.getFullYear().toString();
          metadataTags.add(year);
          
          const monthNames = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
          const month = monthNames[date.getMonth()];
          metadataTags.add(month);
        }

        // 4. Album (Fetch album title if uploaded to an album)
        if (albumId) {
          const album = await prisma.album.findUnique({ where: { id: albumId } });
          if (album && album.title) {
            metadataTags.add(album.title.toLowerCase().trim());
          }
        }

        const newTags = Array.from(metadataTags).filter(t => t.length > 0 && t.length < 50);
        
        // Merge AI tags with manual tags, avoiding duplicates
        newTags.forEach((tag: string) => {
          if (!parsedTags.includes(tag)) {
            parsedTags.push(tag);
          }
        });
      } catch (err) {
        console.error("Metadata Auto-tagging failed during upload:", err);
      }
    }

    const tagConnectOrCreate = parsedTags.map((tag: string) => ({
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

    if (photo.url && photo.url.startsWith("/uploads/")) {
      syncLocalPhotoToCloud(photo.id, photo.url).catch(console.error);
    }

    return NextResponse.json({ photo }, { status: 201 });
  } catch (error: any) {
    console.error("Upload Photo API error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
