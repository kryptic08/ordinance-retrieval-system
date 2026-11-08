import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { ensurePublicArchitectureAssets } from "@/lib/init-public-assets";

export async function GET(request: NextRequest) {
  // Ensure the inverted image is generated and saved into public folders
  ensurePublicArchitectureAssets();

  const searchParams = request.nextUrl.searchParams;
  const isDownload = searchParams.get("download") === "true";
  const theme = searchParams.get("theme"); // "dark" or default "light" (inverted)

  const filename =
    theme === "dark"
      ? "architecture-diagram-dark.png"
      : "architecture-diagram-inverted.png";

  const candidatePaths = [
    path.join(process.cwd(), "public", filename),
    path.resolve("c:/Users/coped/Documents/ordinance-retrieval-system/frontend/public", filename),
    path.join(process.cwd(), "..", "public", filename),
  ];

  let imageBuffer: Buffer | null = null;
  for (const p of candidatePaths) {
    try {
      if (fs.existsSync(p)) {
        imageBuffer = fs.readFileSync(p);
        break;
      }
    } catch {}
  }

  if (!imageBuffer) {
    return new NextResponse("Architecture image not found", { status: 404 });
  }

  const downloadFilename =
    theme === "dark"
      ? "ordisearch-architecture-dark.png"
      : "ordisearch-architecture-inverted.png";

  const headers: Record<string, string> = {
    "Content-Type": "image/png",
    "Cache-Control": "public, max-age=31536000, immutable",
    "Content-Disposition": isDownload
      ? `attachment; filename="${downloadFilename}"`
      : `inline; filename="${downloadFilename}"`,
  };

  return new NextResponse(new Uint8Array(imageBuffer), {
    status: 200,
    headers,
  });
}
