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
