import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "moderation.json");

const DEFAULT_SETTINGS = {
  bannedWords: ['spam', 'scam', 'crypto', 'nsfw', 'buy now'],
  thresholds: {
    nsfw: 85,
    violence: 70,
    watermark: 90
  }
};

function getSettings() {
  if (fs.existsSync(DATA_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    } catch (e) {
      console.error("Error reading moderation.json:", e);
    }
  }
  return DEFAULT_SETTINGS;
}

export async function GET() {
  return NextResponse.json({ settings: getSettings() });
}

export async function POST(request: Request) {
  try {
    const settings = await request.json();
    fs.writeFileSync(DATA_FILE, JSON.stringify(settings, null, 2), "utf-8");
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error("Error writing moderation.json:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
