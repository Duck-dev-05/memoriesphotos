import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSessionCookie } from "@/lib/auth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  
  if (!code) {
    return NextResponse.redirect(new URL("/login?error=MissingCode", req.url));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  const origin = process.env.NODE_ENV === "production" ? "https://memoriesphotos.vercel.app" : "http://localhost:3003";
  const redirectUri = `${origin}/api/auth/google/callback`;

  try {
    // 1. Exchange auth code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId || "",
        client_secret: clientSecret || "",
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenRes.json();
    if (!tokens.access_token) {
      console.error("Token response error:", tokens);
      throw new Error("Failed to retrieve access token from Google");
    }

    // 2. Fetch user profile using the access token
    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = await userRes.json();

    if (!profile.email) throw new Error("No email found in Google profile");

    // 3. Find existing user or create a new one
    let user = await prisma.user.findUnique({
      where: { email: profile.email }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: profile.email,
          name: profile.name || "Google User",
          image: profile.picture || null,
          // passwordHash is optional for OAuth users
        }
      });
    } else if (profile.picture && user.image !== profile.picture) {
      // Update image if it has changed
      user = await prisma.user.update({
        where: { email: profile.email },
        data: { image: profile.picture }
      });
    }

    // 4. Create session cookie via JWT
    await createSessionCookie({
      userId: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
    });

    // 5. Redirect back to homepage
    return NextResponse.redirect(new URL("/", req.url));
  } catch (error: any) {
    console.error("Google OAuth error:", error);
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, req.url));
  }
}
