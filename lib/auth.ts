import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE_NAME = "memories_session";

// Secret key for JWT
const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret-memories-app-key-12345");

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  image?: string | null;
}

export async function createSessionCookie(payload: SessionPayload) {
  const jwt = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(SECRET);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function deleteSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  
  if (!sessionToken) return null;

  try {
    const { payload } = await jwtVerify(sessionToken, SECRET);
    return payload as unknown as SessionPayload;
  } catch (error) {
    return null;
  }
}

// Keep backward compatibility for simple checks
export async function isAuthenticated() {
  const session = await getSession();
  return !!session;
}


export async function checkAuthServerAction() {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized: You must be logged in to perform this action.");
  }
  
  // Ensure user still exists in DB (prevents foreign key constraint errors if DB was reset)
  const user = await prisma.user.findUnique({
    where: { id: session.userId }
  });

  if (!user) {
    await deleteSessionCookie();
    throw new Error("Unauthorized: User account no longer exists. Please log in again.");
  }

  return session;
}
