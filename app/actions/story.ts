"use server";

import { prisma } from "@/lib/prisma";
import { checkAuthServerAction } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function getStories() {
  const session = await checkAuthServerAction();
  
  const stories = await prisma.story.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    include: {
      photos: {
        take: 1,
      },
      _count: {
        select: { photos: true },
      },
    },
  });

  return stories;
}

export async function getStoryById(id: string) {
  const session = await checkAuthServerAction();
  
  const story = await prisma.story.findUnique({
    where: { id, userId: session.userId },
    include: {
      photos: {
        orderBy: { createdAt: "asc" }
      }
    }
  });

  return story;
}

export async function createStory(formData: FormData) {
  const session = await checkAuthServerAction();
  
  const title = formData.get("title") as string;
  const content = formData.get("content") as string;
  const photoIdsJson = formData.get("photoIds") as string;
  
  if (!title) {
    throw new Error("Title is required");
  }

  let photoIds: string[] = [];
  try {
    if (photoIdsJson) {
      photoIds = JSON.parse(photoIdsJson);
    }
  } catch (e) {
    // skip
  }

  const story = await prisma.story.create({
    data: {
      title,
      content,
      userId: session.userId,
      photos: {
        connect: photoIds.map(id => ({ id }))
      }
    },
    include: {
      photos: true
    }
  });

  // Automatically set cover image to the first photo if not provided
  if (story.photos.length > 0 && story.photos[0].url) {
    await prisma.story.update({
      where: { id: story.id },
      data: { coverImage: story.photos[0].url }
    });
  }

  revalidatePath("/about");
  redirect("/about");
}

export async function deleteStory(id: string) {
  const session = await checkAuthServerAction();
  
  await prisma.story.delete({
    where: { id, userId: session.userId }
  });

  revalidatePath("/about");
}

export async function updateStoryContent(id: string, content: string) {
  const session = await checkAuthServerAction();
  
  await prisma.story.update({
    where: { id, userId: session.userId },
    data: { content }
  });

  revalidatePath(`/about/${id}`);
}

export async function removePhotoFromStory(storyId: string, photoId: string) {
  const session = await checkAuthServerAction();
  
  await prisma.story.update({
    where: { id: storyId, userId: session.userId },
    data: {
      photos: {
        disconnect: { id: photoId }
      }
    }
  });

  revalidatePath(`/about/${storyId}`);
}

export async function bulkAddToStory(photoIds: string[], storyId: string) {
  const session = await checkAuthServerAction();
  if (!photoIds || photoIds.length === 0) return;

  const story = await prisma.story.findUnique({
    where: { id: storyId, userId: session.userId },
  });

  if (!story) throw new Error("Unauthorized or Story not found");

  await prisma.story.update({
    where: { id: storyId },
    data: {
      photos: {
        connect: photoIds.map(id => ({ id }))
      }
    }
  });

  // Automatically set cover image to the first photo if not provided
  if (!story.coverImage) {
    const firstPhoto = await prisma.photo.findUnique({ where: { id: photoIds[0] } });
    if (firstPhoto && firstPhoto.url) {
      await prisma.story.update({
        where: { id: storyId },
        data: { coverImage: firstPhoto.url }
      });
    }
  }

  revalidatePath(`/about`);
  revalidatePath(`/about/${storyId}`);
  revalidatePath(`/`);
}

export async function setStoryPhotos(storyId: string, photoIds: string[]) {
  const session = await checkAuthServerAction();

  const story = await prisma.story.findUnique({
    where: { id: storyId, userId: session.userId },
  });

  if (!story) throw new Error("Unauthorized or Story not found");

  await prisma.story.update({
    where: { id: storyId },
    data: {
      photos: {
        set: photoIds.map(id => ({ id }))
      }
    }
  });

  // Set cover image if empty and we have photos
  if (!story.coverImage && photoIds.length > 0) {
    const firstPhoto = await prisma.photo.findUnique({ where: { id: photoIds[0] } });
    if (firstPhoto && firstPhoto.url) {
      await prisma.story.update({
        where: { id: storyId },
        data: { coverImage: firstPhoto.url }
      });
    }
  }

  revalidatePath(`/about/${storyId}`);
  revalidatePath(`/about`);
}

export async function getPublicStory(token: string) {
  const story = await prisma.story.findUnique({
    where: { shareToken: token },
    include: {
      user: true,
      photos: {
        orderBy: { createdAt: "desc" }
      }
    }
  });

  return story;
}

export async function saveGuestUploadedStoryPhotoRecord(token: string, data: { url: string, altText: string, exifData: any }) {
  const story = await prisma.story.findUnique({
    where: { shareToken: token },
    select: { id: true, userId: true }
  });

  if (!story) {
    throw new Error("Story not found or invalid token");
  }

  const photo = await prisma.photo.create({
    data: {
      url: data.url,
      altText: data.altText || "Guest Photo",
      userId: story.userId, // belong to the story owner
      storyId: story.id,
      dateTaken: data.exifData?.dateTaken || null,
    }
  });

  revalidatePath(`/shared-story/${token}`);
  return photo;
}

export async function generateStoryShareLink(storyId: string) {
  const session = await checkAuthServerAction();
  const token = require("crypto").randomBytes(16).toString("hex");

  await prisma.story.update({
    where: { id: storyId, userId: session.userId },
    data: {
      isPublic: true,
      shareToken: token,
    },
  });

  revalidatePath(`/about/${storyId}`);
  return token;
}

export async function removeStoryShareLink(storyId: string) {
  const session = await checkAuthServerAction();

  await prisma.story.update({
    where: { id: storyId, userId: session.userId },
    data: {
      isPublic: false,
      shareToken: null,
      isCollaborative: false, // reset collaborative as well
    },
  });

  revalidatePath(`/about/${storyId}`);
}

export async function toggleStoryCollaborative(storyId: string, isCollaborative: boolean) {
  const session = await checkAuthServerAction();

  await prisma.story.update({
    where: { id: storyId, userId: session.userId },
    data: { isCollaborative },
  });

  revalidatePath(`/about/${storyId}`);
}
