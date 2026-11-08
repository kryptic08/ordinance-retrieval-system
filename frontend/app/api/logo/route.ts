import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

const CANDIDATE_SOURCE_PATHS = [
  "C:\\Users\\coped\\.gemini\\antigravity\\brain\\c002d3c4-0b39-4aa1-9f86-7afc8999f0d1\\.user_uploaded\\media_1793530746490.png",
  path.join(process.cwd(), "public", "logo.png"),
  path.join(process.cwd(), "..", "public", "logo.png"),
];

export async function GET() {
  let imageBuffer: Buffer | null = null;

  for (const p of CANDIDATE_SOURCE_PATHS) {
    try {
      if (fs.existsSync(p)) {
        imageBuffer = fs.readFileSync(p);
        break;
      }
    } catch {}
  }

  // Ensure public/logo.png and public/favicon.ico exist if possible
  if (imageBuffer) {
    try {
      const publicDir = path.join(process.cwd(), "public");
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }
      const publicLogo = path.join(publicDir, "logo.png");
      const publicFavicon = path.join(publicDir, "favicon.ico");
      if (!fs.existsSync(publicLogo)) {
        fs.writeFileSync(publicLogo, imageBuffer);
      }
      if (!fs.existsSync(publicFavicon)) {
        fs.writeFileSync(publicFavicon, imageBuffer);
      }
    } catch {}

    return new NextResponse(new Uint8Array(imageBuffer), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  return new NextResponse("Logo not found", { status: 404 });
}
