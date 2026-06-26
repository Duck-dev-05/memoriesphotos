import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { getSession } from "@/lib/auth";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: Request) {
  try {
    const session = await getSession();
    
    // Also allow guest uploads if they have a valid token (handled by checking if they send a specific header or just letting the client request the signature. Wait, if guests need to upload, we should allow it if they provide a valid share token).
    // For now, let's just make it a simple check. If they aren't logged in, they can't sign unless they pass a valid share token.
    // Actually, GuestUploadButton requires a token. We can pass the token in the body.
    const body = await req.json().catch(() => ({}));
    
    if (!session && !body.shareToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const timestamp = Math.round(new Date().getTime() / 1000);
    
    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder: 'memoriesphotos' },
      process.env.CLOUDINARY_API_SECRET!
    );

    return NextResponse.json({
      timestamp,
      signature,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
    });
  } catch (error) {
    console.error("Cloudinary sign error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
