import { NextResponse } from "next/server";
import { checkApiAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GoogleGenAI } from "@google/genai";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await checkApiAuth(request);
    const { id } = await params;

    const photo = await prisma.photo.findUnique({
      where: { id: id, userId: session.userId },
      include: { tags: true }
    });

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "Gemini API key is not configured" }, { status: 500 });
    }

    let buffer: Buffer;
    let mimeType = "image/jpeg";

    // Attempt to fetch the photo data
    if (photo.url && (photo.url.startsWith("http") || photo.url.startsWith("https"))) {
      const res = await fetch(photo.url);
      if (!res.ok) {
         throw new Error("Failed to fetch image from URL");
      }
      const arrayBuffer = await res.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      mimeType = res.headers.get("content-type") || "image/jpeg";
    } else if (photo.url && photo.url.startsWith("/uploads/")) {
       // Local file upload handling, need full URL or file path. 
       // For simplicity, construct full URL using localhost or NEXT_PUBLIC_APP_URL
       const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
       const fullUrl = `${baseUrl}${photo.url}`;
       const res = await fetch(fullUrl);
       if (!res.ok) {
           throw new Error("Failed to fetch local image");
       }
       const arrayBuffer = await res.arrayBuffer();
       buffer = Buffer.from(arrayBuffer);
    } else {
        return NextResponse.json({ error: "Unsupported image format or URL" }, { status: 400 });
    }

    // Call Gemini to generate tags
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: 'Analyze this image and provide exactly 5 relevant keywords/tags describing its contents. Output ONLY a comma-separated list of lowercase tags without any extra text, punctuation, or formatting.' },
            { inlineData: { data: buffer.toString("base64"), mimeType: mimeType } }
          ]
        }
      ]
    });

    if (!response.text) {
        return NextResponse.json({ error: "Failed to generate tags" }, { status: 500 });
    }

    const aiTags = response.text.split(",").map(t => t.trim().toLowerCase()).filter(t => t);
    
    // Get existing tags to avoid duplicates
    const existingTags = photo.tags.map(t => t.name.toLowerCase());
    const newTags = aiTags.filter(tag => !existingTags.includes(tag));

    if (newTags.length === 0) {
        return NextResponse.json({ photo, message: "No new tags found" }, { status: 200 });
    }

    // Connect or create new tags
    const tagConnectOrCreate = newTags.map((tag) => ({
      where: { name: tag },
      create: { name: tag },
    }));

    const updatedPhoto = await prisma.photo.update({
        where: { id: photo.id },
        data: {
            tags: {
                connectOrCreate: tagConnectOrCreate
            }
        },
        include: { tags: true }
    });

    return NextResponse.json({ photo: updatedPhoto, newTags }, { status: 200 });

  } catch (error: any) {
    console.error("Auto-tag Photo API error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
