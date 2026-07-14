import { NextRequest, NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "@/lib/prisma";
import { createApiToken } from "@/lib/auth";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || "218481603135-sj7mggjqaupo2idfopts60uotpre4t68.apps.googleusercontent.com");

export async function POST(req: NextRequest) {
    try {
        const { idToken } = await req.json();

        if (!idToken) {
            return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
        }

        // Verify the ID token
        const ticket = await client.verifyIdToken({
            idToken,
            audience: [
              process.env.GOOGLE_CLIENT_ID || "218481603135-sj7mggjqaupo2idfopts60uotpre4t68.apps.googleusercontent.com",
              "218481603135-sj7mggjqaupo2idfopts60uotpre4t68.apps.googleusercontent.com",
              "895961799970-0qphn8sef2su3fbd536pgsn7r71qpjh4.apps.googleusercontent.com" // Desktop WPF Client ID
            ],
        });

        const payload = ticket.getPayload();

        if (!payload || !payload.email) {
            return NextResponse.json({ error: "Invalid Google token" }, { status: 401 });
        }

        const email = payload.email;
        const name = payload.name || "Google User";
        const picture = payload.picture || null;

        // Check if user exists
        let user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            // Create a new user if they don't exist
            user = await prisma.user.create({
                data: {
                    email,
                    name,
                    image: picture,
                },
            });
        } else if (picture && user.image !== picture) {
            user = await prisma.user.update({
                where: { email },
                data: { image: picture },
            });
        }

        // Generate JWT
        const token = await createApiToken({
            userId: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
        });

        return NextResponse.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                image: picture,
            },
        });

    } catch (error: any) {
        console.error("Google auth error:", error);
        return NextResponse.json({ error: "Internal server error", details: error?.message || String(error) }, { status: 500 });
    }
}
