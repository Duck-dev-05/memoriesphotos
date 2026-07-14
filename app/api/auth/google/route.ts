import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const origin = process.env.NODE_ENV === "production" ? "https://memoriesphotos.vercel.app" : "http://localhost:3003";
  const redirectUri = `${origin}/api/auth/google/callback`;
  
  if (!clientId) {
    return NextResponse.json({ error: "Missing GOOGLE_CLIENT_ID in .env file" }, { status: 500 });
  }

  const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";
  const options = {
    redirect_uri: redirectUri,
    client_id: clientId,
    access_type: "offline",
    response_type: "code",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
    ].join(" "),
  };

  const qs = new URLSearchParams(options);
  return NextResponse.redirect(`${rootUrl}?${qs.toString()}`);
}
