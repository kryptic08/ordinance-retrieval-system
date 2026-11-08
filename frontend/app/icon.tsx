import fs from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  const candidatePaths = [
    "C:\\Users\\coped\\.gemini\\antigravity\\brain\\c002d3c4-0b39-4aa1-9f86-7afc8999f0d1\\.user_uploaded\\media_1793530746490.png",
    path.join(process.cwd(), "public", "logo.png"),
  ];

  let base64 = "";
  for (const p of candidatePaths) {
    try {
      if (fs.existsSync(p)) {
        base64 = `data:image/png;base64,${fs.readFileSync(p).toString("base64")}`;
        break;
      }
    } catch {}
  }

  if (base64) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={base64}
            alt="OrdiSearch Icon"
            width="64"
            height="64"
            style={{ borderRadius: "50%", objectFit: "contain" }}
          />
        </div>
      ),
      { ...size }
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#14683a",
          color: "#ffffff",
          fontSize: 32,
          fontWeight: 700,
          borderRadius: "50%",
        }}
      >
        O
      </div>
    ),
    { ...size }
  );
}
