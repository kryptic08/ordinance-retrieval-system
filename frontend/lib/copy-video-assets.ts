import fs from "node:fs";
import path from "node:path";

const BRAIN_DIR = "C:\\Users\\coped\\.gemini\\antigravity\\brain\\1c7124d5-9459-485b-a39c-70c160710364\\.user_uploaded";
const PUBLIC_DIR = path.resolve(process.cwd(), "remotion-video", "public");

try {
  if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  }
} catch {
  // Read-only filesystem or restricted environment
}

const filesToCopy = [
  "media_1793593901975.jpg",
  "media_1793593901974.jpg",
  "media_1793593906359.jpg",
];

for (const f of filesToCopy) {
  const src = path.join(BRAIN_DIR, f);
  const dest = path.join(PUBLIC_DIR, f);
  try {
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      console.log(`Copied ${f} successfully to ${dest}`);
    } else {
      console.warn(`Source ${src} does not exist`);
    }
  } catch (err) {
    console.error(`Failed to copy ${f}:`, err);
  }
}
