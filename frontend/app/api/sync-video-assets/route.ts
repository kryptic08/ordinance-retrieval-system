import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

export async function GET() {
  const BRAIN_DIR = "C:\\Users\\coped\\.gemini\\antigravity\\brain\\1c7124d5-9459-485b-a39c-70c160710364\\.user_uploaded";
  const REMOTION_PUBLIC = path.resolve(process.cwd(), "..", "remotion-video", "public");

  if (!fs.existsSync(REMOTION_PUBLIC)) {
    fs.mkdirSync(REMOTION_PUBLIC, { recursive: true });
  }

  const files = [
    "media_1793593901975.jpg",
    "media_1793593901974.jpg",
    "media_1793593906359.jpg",
  ];

  const results = [];
  for (const f of files) {
    const src = path.join(BRAIN_DIR, f);
    const dest = path.join(REMOTION_PUBLIC, f);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      results.push({ file: f, copied: true, dest });
    } else {
      results.push({ file: f, copied: false, error: "source not found" });
    }
  }

  return NextResponse.json({ status: "ok", results });
}
