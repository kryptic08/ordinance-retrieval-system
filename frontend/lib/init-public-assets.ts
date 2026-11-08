import fs from "node:fs";
import path from "node:path";
import { invertPngColors } from "./png-invert";

const SOURCE_IMAGE_PATHS = [
  "C:\\Users\\coped\\.gemini\\antigravity\\brain\\c002d3c4-0b39-4aa1-9f86-7afc8999f0d1\\.user_uploaded\\media_1793588297612_39ce6d5c.png",
];

let hasInitialized = false;

export function ensurePublicArchitectureAssets() {
  if (hasInitialized) return;
  hasInitialized = true;

  try {
    let sourceBuffer: Buffer | null = null;
    for (const src of SOURCE_IMAGE_PATHS) {
      if (fs.existsSync(src)) {
        sourceBuffer = fs.readFileSync(src);
        break;
      }
    }

    if (!sourceBuffer) return;

    // Create inverted light-mode version
    let invertedBuffer: Buffer;
    try {
      invertedBuffer = invertPngColors(sourceBuffer);
    } catch (e) {
      console.warn("PNG inversion fallback:", e);
      invertedBuffer = sourceBuffer;
    }

    const publicDirs = [
      path.join(process.cwd(), "public"),
      path.join(process.cwd(), "..", "public"),
      path.resolve("c:/Users/coped/Documents/ordinance-retrieval-system/frontend/public"),
      path.resolve("c:/Users/coped/Documents/ordinance-retrieval-system/public"),
    ];

    for (const dir of publicDirs) {
      try {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        // 1. The default architecture-diagram.png is now the INVERTED (light) version
        fs.writeFileSync(path.join(dir, "architecture-diagram.png"), invertedBuffer);
        fs.writeFileSync(path.join(dir, "architecture-diagram-inverted.png"), invertedBuffer);
        fs.writeFileSync(path.join(dir, "architecture-diagram-light.png"), invertedBuffer);

        // 2. The original dark version is also saved as architecture-diagram-dark.png
        fs.writeFileSync(path.join(dir, "architecture-diagram-dark.png"), sourceBuffer);
      } catch (err) {
        console.warn(`Could not write to ${dir}:`, err);
      }
    }
  } catch (err) {
    console.warn("ensurePublicArchitectureAssets error:", err);
  }
}

