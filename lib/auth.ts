import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { prisma } from "@/lib/prisma";
import { OAuth2Client } from "google-auth-library";

export const SESSION_COOKIE_NAME = "memories_session";

// Secret key for JWT
const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret-memories-app-key-12345");

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  image?: string | null;
}

export async function createApiToken(payload: SessionPayload): Promise<string> {
  const jwt = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(SECRET);
  return jwt;
}

export async function createSessionCookie(payload: SessionPayload) {
  const jwt = await createApiToken(payload);

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

export async function getApiSession(request: Request): Promise<SessionPayload | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return await getSession(); // fallback to cookie for browser clients
  }
  
  const token = authHeader.split(' ')[1];
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as SessionPayload;
  } catch (error) {
    // Fallback: Check if it's a valid Google idToken
    try {
      const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || "218481603135-sj7mggjqaupo2idfopts60uotpre4t68.apps.googleusercontent.com");
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: [
          process.env.GOOGLE_CLIENT_ID || "218481603135-sj7mggjqaupo2idfopts60uotpre4t68.apps.googleusercontent.com",
          "218481603135-sj7mggjqaupo2idfopts60uotpre4t68.apps.googleusercontent.com"
        ],
      });
      
      const googlePayload = ticket.getPayload();
      if (googlePayload && googlePayload.email) {
        let user = await prisma.user.findUnique({
          where: { email: googlePayload.email }
        });
        
        // Auto-register user if they don't exist to allow seamless API access
        if (!user) {
          user = await prisma.user.create({
            data: {
              email: googlePayload.email,
              name: googlePayload.name || "Google User",
              image: googlePayload.picture || null,
            }
          });
        } else if (googlePayload.picture && user.image !== googlePayload.picture) {
           // Update profile picture if it changed
           user = await prisma.user.update({
             where: { email: googlePayload.email },
             data: { image: googlePayload.picture }
           });
        }
        
        return {
          userId: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      }
    } catch (googleError) {
      return null;
    }
    return null;
  }
}

export async function checkApiAuth(request: Request): Promise<SessionPayload> {
  const session = await getApiSession(request);
  if (!session) {
    throw new Error("Unauthorized");
  }
  
  const user = await prisma.user.findUnique({
    where: { id: session.userId }
  });

  if (!user) {
    throw new Error("Unauthorized: User account no longer exists.");
  }

  return session;
}
