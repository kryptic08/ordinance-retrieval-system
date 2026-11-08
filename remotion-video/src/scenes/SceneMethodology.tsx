import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Img, staticFile } from "remotion";
import {
  FileText,
  ScanText,
  Scissors,
  Cpu,
  Database,
  Lock,
  ArrowRight,
  Layers,
  Wand2,
} from "lucide-react";
import { THEME, TELEPROMPTER_TICKS } from "../constants";
import { TopHeaderBar, TeleprompterBar } from "../components/SharedUI";

export const SceneMethodology: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sec = frame / fps;

  const ticks = TELEPROMPTER_TICKS.METHODOLOGY;
  const t1 = ticks[1]?.startSec ?? 9.1;
  const t2 = ticks[2]?.startSec ?? 20.2;
  const t3 = ticks[3]?.startSec ?? 29.9;
  const t4 = ticks[4]?.startSec ?? 41.9;
  const t5 = ticks[5]?.startSec ?? 55.7;
  const t6 = ticks[6]?.startSec ?? 68.4;
  const t7 = ticks[7]?.startSec ?? 78.7;

  // 4 Visual Stages dynamically locked to audio ticks:
  // Stage 1 (Ticks 0, 1, 2, 3): RAD Lifecycle, Bilingual PDF/OCR Scan, Spell Repair & Wet Signature Isolation
  // Stage 2 (Ticks 4, 5): Bilingual Expansion, Section Slicing + 384-d BGE-small Indexing
  // Stage 3 (Tick 6): 4 Retrieval Modes + Lexical & Bilingual Stem Reranking
  // Stage 4 (Tick 7): Three-Tier Architecture Flow (Next.js 15 + FastAPI + SQLite / Convex)
  const stage = sec < t4 ? 1 : sec < t6 ? 2 : sec < t7 ? 3 : 4;

  // Stage 1 animations
  const scanY = interpolate((frame % Math.round(fps * 5.0)) / Math.round(fps * 5.0), [0, 1], [30, 415]);
  const sliceSpring1 = spring({ frame: Math.max(0, frame - Math.round(fps * 2.5)), fps, config: { damping: 13, stiffness: 100 } });
  const sliceSpring2 = spring({ frame: Math.max(0, frame - Math.round(fps * 5.5)), fps, config: { damping: 13, stiffness: 100 } });
  const sliceSpring3 = spring({ frame: Math.max(0, frame - Math.round(fps * 8.5)), fps, config: { damping: 13, stiffness: 100 } });

  // Stage 2 & 3 animations
  const encoderPulse = Math.sin(frame / 5) * 0.05 + 1;
  const stage3Frame = Math.max(0, frame - Math.round(fps * t4));
  const stage3Step = stage3Frame < 60 ? 1 : stage3Frame < 150 ? 2 : stage3Frame < 280 ? 3 : 4;
  const vectorRayLen = spring({
    frame: Math.max(0, stage3Frame - 10),
    fps,
    config: { damping: 16, stiffness: 80 },
  });
  const vectorDocLen = spring({
    frame: Math.max(0, stage3Frame - 30),
    fps,
    config: { damping: 16, stiffness: 80 },
  });
  const vectorAngleArc = spring({
    frame: Math.max(0, stage3Frame - 50),
    fps,
    config: { damping: 14, stiffness: 70 },
  });
  const swapProgress = spring({
    frame: Math.max(0, stage3Frame - Math.round(fps * 3.0)),
    fps,
    config: { damping: 14, stiffness: 90 },
  });

  // Stage 4 animations
  const stage4Frame = Math.max(0, frame - Math.round(fps * t5));
  const packetPos = (stage4Frame * 6) % 320;

  const vectorBars = [
    0.78, 0.35, 0.92, 0.48, 0.84, 0.25, 0.67, 0.95, 0.41, 0.73, 0.58, 0.89, 0.32, 0.76, 0.91, 0.44, 0.82, 0.63,
  ];

  // Dynamic 3D Camera Zoom, Focus Origin & Cinematic Tilt
  // Subtle, balanced cinematic camera push-in across Methodology (Max 1.05x, centered)
  const cameraZoom = interpolate(
    sec,
    [0, 10, 12, 21, 23, 31.5, 33, 42, 44, 53, 55, 68, 70, 78, 80, 90],
    [1.0, 1.0, 1.04, 1.04, 1.03, 1.03, 1.01, 1.04, 1.04, 1.01, 1.05, 1.05, 1.01, 1.04, 1.02, 1.04],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const cameraOriginX = 50;
  const cameraOriginY = 50;

  const cameraTiltX = interpolate(
    sec,
    [0, 12, 23, 34, 45, 55, 68, 78, 90],
    [0, 0.2, -0.2, 0.15, 0.2, -0.2, 0.15, -0.15, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const cameraTiltY = interpolate(
    sec,
    [0, 12, 23, 34, 45, 55, 68, 78, 90],
    [0, -0.2, 0.2, -0.15, -0.2, 0.2, -0.15, 0.15, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: THEME.bg,
        backgroundImage: `radial-gradient(circle at 20% 20%, rgba(20, 104, 58, 0.06), transparent 40%), radial-gradient(circle at 80% 15%, rgba(217, 119, 6, 0.05), transparent 35%)`,
        fontFamily: THEME.fontSans,
        color: THEME.ink900,
        overflow: "hidden",
      }}
    >
      <TopHeaderBar activeTab="Methodology" />

      <div
        style={{
          padding: "22px 72px 86px 72px",
          height: "calc(100% - 64px)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        {/* Top Visual Stage Stepper (Anchored Chrome) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: THEME.paper,
            border: `1px solid ${THEME.border}`,
            borderRadius: 16,
            padding: "12px 24px",
            boxShadow: "0 6px 20px -14px rgba(15, 23, 42, 0.1)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                padding: "4px 12px",
                borderRadius: 999,
                backgroundColor: THEME.civic50,
                color: THEME.civic700,
                fontSize: 11.5,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              How OrdiSearch Works
            </span>
            <span style={{ fontFamily: THEME.fontSerif, fontSize: 21, fontWeight: 700, color: THEME.ink950 }}>
              {stage === 1 && "Stage 1 · Bilingual OCR Spell Repair & Wet-Signature Isolation"}
              {stage === 2 && "Stage 2 · Structural Section Slicing & 384-d Convex Vector Indexing"}
              {stage === 3 && "Stage 3 · 4 Retrieval Modes & Lexical + Bilingual Stem Reranker"}
              {stage === 4 && "Stage 4 · Three-Tier Architecture (Next.js 15 + FastAPI + Convex)"}
            </span>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            {[
              { n: 1, label: "1. Bilingual OCR & Privacy" },
              { n: 2, label: "2. 384-d Vector Index" },
              { n: 3, label: "3. Hybrid + Rerank" },
              { n: 4, label: "4. 3-Tier Stack" },
            ].map((s) => (
              <div
                key={s.n}
                style={{
                  padding: "6px 14px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                  backgroundColor: stage === s.n ? THEME.civic600 : THEME.secondaryBg,
                  color: stage === s.n ? "#ffffff" : THEME.ink600,
                }}
              >
                {s.label}
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic 3D Camera Viewport for Stage Content */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            transform: `perspective(1400px) rotateX(${cameraTiltX}deg) rotateY(${cameraTiltY}deg) scale(${cameraZoom})`,
            transformOrigin: `${cameraOriginX}% ${cameraOriginY}%`,
            transformStyle: "preserve-3d",
          }}
        >
          {/* ==================== STAGE 1: ANIMATED BILINGUAL PDF/OCR & SIGNATURE ISOLATION ==================== */}
        {stage === 1 && (
          <div
            style={{
              flex: 1,
              marginTop: 18,
              display: "grid",
              gridTemplateColumns: "480px 130px 1fr",
              gap: 22,
              alignItems: "center",
            }}
          >
            {/* Left: Real Polangui Ordinance PDF Page with Live OCR Laser Scanner */}
            <div
              style={{
                height: 492,
                backgroundColor: THEME.paper,
                borderRadius: 20,
                border: `2px solid ${THEME.borderStrong}`,
                boxShadow: "0 24px 48px -20px rgba(15, 23, 42, 0.18)",
                position: "relative",
                overflow: "hidden",
                padding: "20px 24px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              {/* PDF Top Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${THEME.border}`, paddingBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <FileText size={17} color={THEME.civic700} />
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: THEME.ink900 }}>
                    046 S.2025 BORROWING 50M SANITARY LANDFILL.pdf
                  </span>
                </div>
                <span style={{ fontSize: 10.5, fontFamily: THEME.fontMono, color: THEME.civic700, backgroundColor: THEME.civic50, padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>
                  16 Scanned Pages
                </span>
              </div>

              {/* Document Regions being scanned & OCR-repaired */}
              <div style={{ display: "flex", flexDirection: "column", gap: 11, marginTop: 10, flex: 1 }}>
                {[
                  {
                    yTrigger: 75,
                    tag: "TITLE",
                    raw: "Mavlcipsl 0rdinanc3 N0. 046 S.2025 (Scanned Noisy OCR)",
                    clean: "MUNICIPAL ORDINANCE NO. 046, S. 2025 · AUTHORIZING HON. RAYMOND ADRIAN E. SALCEDA",
                    repair: "Fixed 'Mavlcipsl 0rdinanc3' → 'MUNICIPAL ORDINANCE'",
                    color: THEME.civic700,
                    bg: THEME.civic50,
                  },
                  {
                    yTrigger: 160,
                    tag: "SECTION 1",
                    raw: "0rdinance Granting Auth0rity to the Mun. Mayor...",
                    clean: "Ordinance Granting Authority to the Municipal Mayor to enter into and sign the Agreement...",
                    repair: "Reconstructed legal title & heading",
                    color: THEME.blue700,
                    bg: THEME.blue50,
                  },
                  {
                    yTrigger: 245,
                    tag: "SECTION 2",
                    raw: "Auth0rity. Granted auth0rity to sign 0mnibus Term...",
                    clean: "Authority. Granted authority to sign the Omnibus Term Agreement with Land Bank...",
                    repair: "Repaired statutory token stems",
                    color: THEME.civic700,
                    bg: THEME.civic50,
                  },
                  {
                    yTrigger: 325,
                    tag: "SECTION 3 & 4",
                    raw: "Limitati0n & Effectivity. Enacted this 27th...",
                    clean: "Limitation & Effectivity. Enacted by the Sangguniang Bayan of Polangui, Albay.",
                    repair: "Standardized enacting clause date & text",
                    color: THEME.emerald700,
                    bg: THEME.emerald50,
                  },
                ].map((block) => {
                  const isScanned = scanY >= block.yTrigger;
                  return (
                    <div
                      key={block.tag}
                      style={{
                        padding: "9px 12px",
                        borderRadius: 10,
                        border: isScanned ? `1.5px solid ${block.color}` : `1px dashed ${THEME.borderStrong}`,
                        backgroundColor: isScanned ? block.bg : THEME.secondaryBg,
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: isScanned ? block.color : THEME.ink400, letterSpacing: "0.08em" }}>
                          {isScanned ? `✓ OCR SPELL REPAIRED · ${block.tag}` : "RAW SCANNED IMAGE LAYER"}
                        </span>
                        {isScanned && (
                          <span style={{ fontSize: 9.5, fontWeight: 700, color: THEME.emerald700, backgroundColor: "#ecfdf5", padding: "1px 6px", borderRadius: 4 }}>
                            {block.repair}
                          </span>
                        )}
                      </div>
                      {isScanned ? (
                        <div style={{ fontSize: 12, fontWeight: 600, color: THEME.ink900, fontFamily: THEME.fontSerif }}>
                          {block.clean}
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "2px 0" }}>
                          <div style={{ fontSize: 11, fontFamily: THEME.fontMono, color: THEME.ink400, opacity: 0.8 }}>
                            {block.raw}
                          </div>
                          <div style={{ height: 6, width: "75%", backgroundColor: THEME.ink300, borderRadius: 4, filter: "blur(1px)" }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Bottom Wet Signature Block with Animated Security Shield */}
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  backgroundColor: sec >= t2 ? "#fef3c7" : THEME.gold50,
                  border: sec >= t2 ? `2px solid ${THEME.gold700}` : `1.5px solid ${THEME.gold500}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  boxShadow: sec >= t2 ? "0 8px 20px -8px rgba(180, 83, 9, 0.35)" : "none",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Lock size={15} color={THEME.gold700} />
                  <div>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: THEME.ink900, display: "block" }}>
                      Physical Wet Signature Block (Hon. Raymond Adrian E. Salceda)
                    </span>
                    <span style={{ fontSize: 10, color: THEME.gold700, fontWeight: 600 }}>
                      Isolated by Signature Masking Module · Not Exposed via Public Search API
                    </span>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: "#ffffff",
                    backgroundColor: THEME.gold700,
                    padding: "3px 8px",
                    borderRadius: 6,
                    textTransform: "uppercase",
                  }}
                >
                  Shielded
                </span>
              </div>

              {/* Glowing Green Laser Scan Bar */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: scanY,
                  height: 4,
                  backgroundColor: THEME.emerald500,
                  boxShadow: "0 0 22px 6px rgba(16, 185, 129, 0.55)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  paddingRight: 12,
                }}
              >
                <div
                  style={{
                    backgroundColor: THEME.civic800,
                    color: "#ffffff",
                    fontSize: 10.5,
                    fontWeight: 700,
                    padding: "3px 10px",
                    borderRadius: 999,
                    transform: "translateY(-14px)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
                  }}
                >
                  <Img src={staticFile("tech/python.svg")} style={{ width: 13, height: 13 }} />
                  <span>PyMuPDF + Bilingual Tesseract OCR (eng+fil)</span>
                </div>
              </div>
            </div>

            {/* Center: Bilingual OCR Spell Repair & Section Parser */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 66,
                  height: 66,
                  borderRadius: 20,
                  backgroundColor: THEME.civic600,
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 14px 28px -10px rgba(20, 104, 58, 0.45)",
                  transform: `scale(${encoderPulse})`,
                }}
              >
                {sec < t2 ? <Wand2 size={28} /> : <Scissors size={28} />}
              </div>
              <div style={{ fontSize: 11.5, fontWeight: 800, color: THEME.civic700, textAlign: "center", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Bilingual OCR
                <br />
                &amp; Section Parser
              </div>
              <ArrowRight size={24} color={THEME.civic600} />
            </div>

            {/* Right: Sliced Authentic Polangui Section Cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
              {[
                {
                  sp: sliceSpring1,
                  sec: "Ord. No. 046, S. 2025 · Section 1 (Title)",
                  page: "Page 2",
                  preview:
                    "Ordinance Granting Authority to the Municipal Mayor to enter into and to sign the Agreement with the Land Bank of the Philippines.",
                  chunks: "Bilingual OCR Cleaned",
                },
                {
                  sp: sliceSpring2,
                  sec: "Ord. No. 046, S. 2025 · Section 2 (Authority)",
                  page: "Page 3",
                  preview:
                    "The Municipal Mayor is hereby granted the authority to enter into and to sign the Omnibus Term Agreement with the Land Bank of the Philippines.",
                  chunks: "Chunk #2 · 384-d Ready",
                  highlight: true,
                },
                {
                  sp: sliceSpring3,
                  sec: "Ord. No. 11-062, S. 2025 · Section 4 (First 1,000 Days)",
                  page: "Page 5",
                  preview:
                    "Scaling Up Health and Nutrition for the First 1,000 Days of Life in the Municipality of Polangui and appropriating funds.",
                  chunks: "43 Sections Parsed",
                },
              ].map((card) => (
                <div
                  key={card.sec}
                  style={{
                    opacity: card.sp,
                    transform: `translateX(${interpolate(card.sp, [0, 1], [-45, 0])}px)`,
                    backgroundColor: THEME.paper,
                    border: card.highlight ? `2px solid ${THEME.civic600}` : `1px solid ${THEME.border}`,
                    borderRadius: 18,
                    padding: "16px 20px",
                    boxShadow: card.highlight
                      ? "0 18px 36px -16px rgba(20, 104, 58, 0.22)"
                      : "0 10px 24px -16px rgba(15, 23, 42, 0.1)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 14.5, fontWeight: 700, color: THEME.civic800, display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <Layers size={15} color={THEME.civic600} />
                      {card.sec}
                    </span>
                    <div style={{ display: "flex", gap: 8 }}>
                      <span style={{ padding: "2px 8px", borderRadius: 6, backgroundColor: THEME.secondaryBg, fontSize: 11, fontWeight: 700, color: THEME.ink700 }}>
                        {card.page}
                      </span>
                      <span style={{ padding: "2px 8px", borderRadius: 6, backgroundColor: THEME.civic50, fontSize: 11, fontWeight: 700, color: THEME.civic700 }}>
                        {card.chunks}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontFamily: THEME.fontSerif, fontSize: 14, color: THEME.ink800, lineHeight: 1.45 }}>
                    “{card.preview}”
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================== STAGE 2: ANIMATED 384-D VECTOR EMBEDDING & DUAL INDEXING ==================== */}
        {stage === 2 && (
          <div
            style={{
              flex: 1,
              marginTop: 18,
              display: "grid",
              gridTemplateColumns: "390px 250px 1fr",
              gap: 24,
              alignItems: "center",
            }}
          >
            {/* Left: Input Parsed Section Card from Ordinance No. 046 */}
            <div
              style={{
                backgroundColor: THEME.paper,
                border: `2px solid ${THEME.civic600}`,
                borderRadius: 20,
                padding: "24px",
                boxShadow: "0 18px 38px -18px rgba(20, 104, 58, 0.2)",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 800, color: THEME.civic700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                Parsed Section Chunk (Page 3)
              </div>
              <div style={{ fontFamily: THEME.fontSerif, fontSize: 20, fontWeight: 700, color: THEME.ink950, marginBottom: 10 }}>
                Ordinance No. 046, S. 2025 · Section 2
              </div>
              <div
                style={{
                  padding: "14px",
                  borderRadius: 12,
                  backgroundColor: THEME.bg,
                  border: `1px solid ${THEME.border}`,
                  fontFamily: THEME.fontSerif,
                  fontSize: 14,
                  lineHeight: 1.55,
                  color: THEME.ink800,
                }}
              >
                “The{" "}
                <span style={{ backgroundColor: THEME.civic100, fontWeight: 700, padding: "1px 4px", borderRadius: 4 }}>
                  Municipal Mayor
                </span>{" "}
                is hereby granted the{" "}
                <span style={{ backgroundColor: THEME.civic100, fontWeight: 700, padding: "1px 4px", borderRadius: 4 }}>
                  authority
                </span>{" "}
                to enter into and to sign the{" "}
                <span style={{ backgroundColor: THEME.gold100, fontWeight: 700, padding: "1px 4px", borderRadius: 4 }}>
                  Omnibus Term Agreement
                </span>{" "}
                with the Land Bank of the Philippines for and on behalf of the LGU of Polangui.”
              </div>
            </div>

            {/* Center: Neural Embedding & Dual Index Sync */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
              <div
                style={{
                  width: "100%",
                  padding: "20px 16px",
                  borderRadius: 20,
                  background: `linear-gradient(135deg, ${THEME.civic700}, ${THEME.civic600})`,
                  color: "#ffffff",
                  textAlign: "center",
                  boxShadow: "0 18px 36px -14px rgba(20, 104, 58, 0.45)",
                  transform: `scale(${encoderPulse})`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "#ffb000", padding: 6, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 14px rgba(255,176,0,0.35)" }}>
                    <Img src={staticFile("tech/huggingface.svg")} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  </div>
                  <Cpu size={28} color="#a7f3d0" />
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#a7f3d0" }}>
                  FastEmbed · Neural CPU
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, marginTop: 2 }}>
                  BAAI/bge-small-en-v1.5
                </div>
                <div style={{ fontSize: 12, color: "#ecfdf5", marginTop: 4, fontFamily: THEME.fontMono }}>
                  384 Dimensions · Sub-Second
                </div>
              </div>

              <div
                style={{
                  width: "100%",
                  padding: "18px 16px",
                  borderRadius: 18,
                  backgroundColor: THEME.paper,
                  border: `1.5px solid ${THEME.borderStrong}`,
                  textAlign: "center",
                  boxShadow: "0 12px 28px -12px rgba(15, 23, 42, 0.14)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 10, backgroundColor: "#fef3c7", border: "1.5px solid #f59e0b" }}>
                    <Img src={staticFile("tech/convex.svg")} style={{ width: 26, height: 26, objectFit: "contain" }} />
                    <span style={{ fontSize: 12.5, fontWeight: 800, color: "#b45309" }}>CONVEX</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 10, backgroundColor: "#eff6ff", border: "1.5px solid #3b82f6" }}>
                    <Img src={staticFile("tech/sqlite.svg")} style={{ width: 26, height: 26, objectFit: "contain" }} />
                    <span style={{ fontSize: 12.5, fontWeight: 800, color: "#1d4ed8" }}>SQLITE</span>
                  </div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: THEME.ink900 }}>
                  Convex Vector Store + SQLite FTS5
                </div>
                <div style={{ fontSize: 12, color: THEME.ink600, marginTop: 2 }}>
                  93 Sections · 193 Chunks Indexed
                </div>
              </div>
            </div>

            {/* Right: Animated Dual Index Visuals */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div
                style={{
                  backgroundColor: THEME.paper,
                  border: `2px solid ${THEME.civic600}`,
                  borderRadius: 20,
                  padding: "22px 26px",
                  boxShadow: "0 16px 34px -18px rgba(20, 104, 58, 0.18)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: "#fef3c7", border: `1.5px solid ${THEME.gold500}`, padding: 5, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 10px rgba(217,119,6,0.2)" }}>
                      <Img src={staticFile("tech/convex.svg")} style={{ width: 26, height: 26, objectFit: "contain" }} />
                    </div>
                    <div>
                      <span style={{ fontSize: 15, fontWeight: 800, color: THEME.civic800, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        Convex `.vectorIndex(&quot;by_embedding&quot;)`
                      </span>
                      <div style={{ fontSize: 11, color: THEME.ink500, fontWeight: 600 }}>Reactive 384-d Cosine Metric Space</div>
                    </div>
                  </div>
                  <span style={{ fontFamily: THEME.fontMono, fontSize: 12, color: THEME.civic700, fontWeight: 700 }}>
                    [ 0.184, -0.542, 0.891, ... ]
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 110, padding: "0 8px" }}>
                  {vectorBars.map((val, i) => {
                    const wave = Math.sin(frame / 6 + i * 0.6) * 0.18 + 0.82;
                    const h = Math.max(18, Math.round(val * wave * 100));
                    return (
                      <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                        <div
                          style={{
                            width: "100%",
                            height: h,
                            borderRadius: "6px 6px 2px 2px",
                            background: i % 3 === 0 ? THEME.gold500 : THEME.civic600,
                          }}
                        />
                        <span style={{ fontFamily: THEME.fontMono, fontSize: 9.5, color: THEME.ink500 }}>
                          d{i + 1}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div
                style={{
                  backgroundColor: THEME.paper,
                  border: `1.5px solid ${THEME.borderStrong}`,
                  borderRadius: 20,
                  padding: "20px 26px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", padding: 3, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Img src={staticFile("tech/sqlite.svg")} style={{ width: 18, height: 18, objectFit: "contain" }} />
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 800, color: THEME.ink900, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      2. SQLite FTS5 &amp; Convex Lexical Index
                    </span>
                  </div>
                  <span style={{ fontSize: 12, color: THEME.ink500, fontWeight: 600 }}>
                    Bilingual English + Filipino Token Index
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                  {[
                    { term: '"mayor"', doc: "Ord. 046 · Sec 1, 2, 3", idf: "Title + Heading" },
                    { term: '"landfill"', doc: "Ord. 046 · Title & Preamble", idf: "Document Context" },
                    { term: '"nutrition"', doc: "Ord. 11-062 · 43 Sections", idf: "First 1,000 Days" },
                    { term: '"rrbwasa"', doc: "Ord. 11-063 · 46 Sections", idf: "Waterworks Assoc." },
                  ].map((tok) => (
                    <div
                      key={tok.term}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 12,
                        backgroundColor: THEME.bg,
                        border: `1px solid ${THEME.border}`,
                      }}
                    >
                      <div style={{ fontFamily: THEME.fontMono, fontSize: 13.5, fontWeight: 800, color: THEME.civic700 }}>
                        {tok.term}
                      </div>
                      <div style={{ fontSize: 11.5, color: THEME.ink700, fontWeight: 600, marginTop: 4 }}>{tok.doc}</div>
                      <div style={{ fontFamily: THEME.fontMono, fontSize: 10.5, color: THEME.ink400, marginTop: 2 }}>{tok.idf}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== STAGE 3: ANIMATED HYBRID SEARCH & 3D VECTOR COORDINATE PLANE ==================== */}
        {stage === 3 && (
          <div style={{ flex: 1, marginTop: 14, display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Top Bar: Under-The-Hood 4-Step Pipeline */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 12,
                backgroundColor: THEME.paper,
                borderRadius: 16,
                padding: "10px 14px",
                border: `1.5px solid ${THEME.border}`,
                boxShadow: "0 6px 18px -8px rgba(0,0,0,0.06)",
              }}
            >
              {[
                {
                  step: 1,
                  num: "01",
                  title: "Query Ingestion",
                  desc: 'Plain text: "borrow funds landfill"',
                  tech: "Python Lexer · Stem Filter",
                },
                {
                  step: 2,
                  num: "02",
                  title: "384-d Neural Embedding",
                  desc: "BAAI/bge-small-en-v1.5 projection",
                  tech: "FastEmbed (Sub-50ms CPU)",
                },
                {
                  step: 3,
                  num: "03",
                  title: "Convex Vector Space",
                  desc: "cos(θ) high-dimensional angle",
                  tech: "Convex Vector Cosine Index",
                },
                {
                  step: 4,
                  num: "04",
                  title: "Hybrid Fusion & Rerank",
                  desc: "0.72 Vec + 0.28 Lexical Heading",
                  tech: "Promotes Ord. 046 Sec. 2 to #1",
                },
              ].map((p) => {
                const isActive = stage3Step === p.step;
                const isPast = stage3Step > p.step;
                return (
                  <div
                    key={p.step}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 12,
                      backgroundColor: isActive ? THEME.civic50 : isPast ? "#f8fafc" : THEME.bg,
                      border: isActive
                        ? `2px solid ${THEME.civic600}`
                        : isPast
                        ? `1.5px solid ${THEME.emerald500}`
                        : `1px solid ${THEME.border}`,
                      boxShadow: isActive ? "0 4px 14px -4px rgba(20, 104, 58, 0.25)" : "none",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          color: isActive ? THEME.civic700 : isPast ? THEME.emerald700 : THEME.ink400,
                          letterSpacing: "0.08em",
                        }}
                      >
                        STEP {p.num} {isPast && "✓"}
                      </span>
                      <span
                        style={{
                          fontSize: 9.5,
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: 4,
                          backgroundColor: isActive ? THEME.civic600 : isPast ? THEME.emerald100 : THEME.secondaryBg,
                          color: isActive ? "#ffffff" : isPast ? THEME.emerald800 : THEME.ink500,
                        }}
                      >
                        {p.tech}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink950, marginTop: 4 }}>{p.title}</div>
                    <div style={{ fontSize: 11, color: THEME.ink600, marginTop: 2 }}>{p.desc}</div>
                  </div>
                );
              })}
            </div>

            {/* Main Stage 3 Grid: Left 3D Vector Space (58%), Right Hybrid Rerank (42%) */}
            <div
              style={{
                flex: 1,
                display: "grid",
                gridTemplateColumns: "1.35fr 1fr",
                gap: 18,
                alignItems: "stretch",
              }}
            >
              {/* Col 1: 3D Semantic Vector Coordinate Plane */}
              <div
                style={{
                  backgroundColor: THEME.paper,
                  border: `2px solid ${THEME.civic600}`,
                  borderRadius: 20,
                  padding: "18px 22px",
                  boxShadow: "0 18px 40px -16px rgba(20, 104, 58, 0.2)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: THEME.civic700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        ENGINE 1 &amp; 3 · HIGH-DIMENSIONAL DENSE VECTOR SPACE
                      </span>
                      <span style={{ padding: "2px 8px", borderRadius: 6, backgroundColor: THEME.civic50, border: `1px solid ${THEME.civic200}`, fontSize: 11, fontWeight: 700, color: THEME.civic800 }}>
                        384-d Space Projected to 3D Isometric View
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: "#ffb000", padding: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Img src={staticFile("tech/huggingface.svg")} style={{ width: 14, height: 14 }} />
                      </div>
                      <span style={{ fontSize: 11.5, fontWeight: 800, color: THEME.ink700 }}>FastEmbed Neural CPU</span>
                    </div>
                  </div>

                  <div style={{ fontFamily: THEME.fontSerif, fontSize: 22, fontWeight: 700, color: THEME.ink950, marginTop: 4 }}>
                    Cosine Proximity: Solving Vocabulary Mismatch
                  </div>
                </div>

                {/* 3D Isometric Vector Space SVG Canvas */}
                <div
                  style={{
                    height: 295,
                    borderRadius: 16,
                    backgroundColor: "#0d1b14",
                    border: `1.5px solid ${THEME.civic700}`,
                    position: "relative",
                    overflow: "hidden",
                    boxShadow: "inset 0 4px 20px rgba(0,0,0,0.4)",
                  }}
                >
                  <svg width="100%" height="100%" viewBox="0 0 700 295">
                    <defs>
                      <marker id="arrow-emerald" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                        <path d="M 0 0 L 6 3 L 0 6 z" fill="#10b981" />
                      </marker>
                      <marker id="arrow-gold" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                        <path d="M 0 0 L 6 3 L 0 6 z" fill="#f59e0b" />
                      </marker>
                      <marker id="arrow-muted" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                        <path d="M 0 0 L 5 3 L 0 5 z" fill="#64748b" />
                      </marker>
                      <radialGradient id="grid-glow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                      </radialGradient>
                    </defs>

                    {/* Subtle backdrop glow */}
                    <circle cx="260" cy="225" r="190" fill="url(#grid-glow)" />

                    {/* Isometric Ground Plane Grid */}
                    {[0, 45, 90, 135, 180, 225, 270].map((step, idx) => (
                      <line
                        key={`xgrid-${idx}`}
                        x1={260 + step * 0.866 - 150 * 0.866}
                        y1={225 + step * 0.5 + 150 * 0.5}
                        x2={260 + step * 0.866 + 60 * 0.866}
                        y2={225 + step * 0.5 - 60 * 0.5}
                        stroke="#1e3a2f"
                        strokeWidth="1"
                        strokeDasharray="3 3"
                      />
                    ))}
                    {[-120, -75, -30, 15, 60].map((step, idx) => (
                      <line
                        key={`ygrid-${idx}`}
                        x1={260 - 45 * 0.866 + step * 0.866}
                        y1={225 - 45 * 0.5 - step * 0.5}
                        x2={260 + 250 * 0.866 + step * 0.866}
                        y2={225 + 250 * 0.5 - step * 0.5}
                        stroke="#1e3a2f"
                        strokeWidth="1"
                        strokeDasharray="3 3"
                      />
                    ))}

                    {/* Coordinate Axes */}
                    {/* Axis X: Fiscal / Borrowing Authority */}
                    <line x1="260" y1="225" x2="540" y2="280" stroke="#334155" strokeWidth="2" />
                    <text x="548" y="284" fill="#94a3b8" fontSize="10.5" fontWeight="700" fontFamily="monospace">
                      Axis 1: Fiscal / Borrowing
                    </text>

                    {/* Axis Y: Waste & Landfill Facilities */}
                    <line x1="260" y1="225" x2="85" y2="278" stroke="#334155" strokeWidth="2" />
                    <text x="20" y="280" fill="#94a3b8" fontSize="10.5" fontWeight="700" fontFamily="monospace">
                      Axis 2: Sanitary Landfill
                    </text>

                    {/* Axis Z: Executive Enacting Authority */}
                    <line x1="260" y1="225" x2="260" y2="35" stroke="#334155" strokeWidth="2" />
                    <text x="266" y="42" fill="#94a3b8" fontSize="10.5" fontWeight="700" fontFamily="monospace">
                      Axis 3: Executive Enactment
                    </text>

                    {/* Origin Dot */}
                    <circle cx="260" cy="225" r="4" fill="#64748b" />
                    <text x="232" y="240" fill="#64748b" fontSize="10" fontFamily="monospace">
                      O(0,0,0)
                    </text>

                    {/* Distant Vector d2: Ord 11-062 Nutrition (Pruned) */}
                    <line
                      x1="260"
                      y1="225"
                      x2={260 - 130 * 0.866}
                      y2={225 - 70}
                      stroke="#475569"
                      strokeWidth="1.8"
                      strokeDasharray="4 4"
                      markerEnd="url(#arrow-muted)"
                    />
                    <circle cx={260 - 130 * 0.866} cy={225 - 70} r="3" fill="#64748b" />
                    <text x={260 - 130 * 0.866 - 20} y={225 - 80} fill="#94a3b8" fontSize="9.5" fontWeight="600">
                      d⃗₂ Ord 11-062 (Nutrition) · θ=78.5° [FILTERED]
                    </text>

                    {/* Distant Vector d3: Ord 11-063 Waterworks (Pruned) */}
                    <line
                      x1="260"
                      y1="225"
                      x2="155"
                      y2="255"
                      stroke="#475569"
                      strokeWidth="1.8"
                      strokeDasharray="4 4"
                      markerEnd="url(#arrow-muted)"
                    />
                    <circle cx="155" cy="255" r="3" fill="#64748b" />
                    <text x="65" y="250" fill="#94a3b8" fontSize="9.5" fontWeight="600">
                      d⃗₃ Ord 11-063 (Waterworks) [FILTERED]
                    </text>

                    {/* MATCHING VECTOR d1: Ord 046 Sec 2 (Amber Ray) */}
                    <line
                      x1="260"
                      y1="225"
                      x2={260 + (495 - 260) * vectorDocLen}
                      y2={225 + (115 - 225) * vectorDocLen}
                      stroke="#f59e0b"
                      strokeWidth="4"
                      markerEnd={vectorDocLen > 0.85 ? "url(#arrow-gold)" : undefined}
                      style={{ filter: "drop-shadow(0 0 8px rgba(245, 158, 11, 0.6))" }}
                    />
                    {vectorDocLen > 0.85 && (
                      <circle cx="495" cy="115" r={6 + Math.sin(frame / 5) * 1.5} fill="#f59e0b" />
                    )}

                    {/* QUERY VECTOR q: "borrow funds landfill" (Emerald Ray) */}
                    <line
                      x1="260"
                      y1="225"
                      x2={260 + (470 - 260) * vectorRayLen}
                      y2={225 + (78 - 225) * vectorRayLen}
                      stroke="#10b981"
                      strokeWidth="4.5"
                      markerEnd={vectorRayLen > 0.85 ? "url(#arrow-emerald)" : undefined}
                      style={{ filter: "drop-shadow(0 0 10px rgba(16, 185, 129, 0.8))" }}
                    />
                    {vectorRayLen > 0.85 && (
                      <circle cx="470" cy="78" r={6 + Math.cos(frame / 5) * 1.5} fill="#10b981" />
                    )}

                    {/* Angular Cosine Arc between q and d1 */}
                    {vectorAngleArc > 0.5 && (
                      <path
                        d="M 365 152 A 150 150 0 0 1 378 170"
                        fill="none"
                        stroke="#34d399"
                        strokeWidth="3"
                        strokeDasharray="2 2"
                      />
                    )}
                  </svg>

                  {/* Floating HTML Badges on top of SVG */}
                  <div
                    style={{
                      position: "absolute",
                      top: 42,
                      left: 440,
                      padding: "5px 12px",
                      borderRadius: 10,
                      backgroundColor: "rgba(16, 185, 129, 0.92)",
                      color: "#ffffff",
                      fontSize: 11.5,
                      fontWeight: 800,
                      boxShadow: "0 8px 18px rgba(16, 185, 129, 0.4)",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span>q⃗ Query: &quot;borrow funds landfill&quot;</span>
                  </div>

                  <div
                    style={{
                      position: "absolute",
                      top: 105,
                      left: 470,
                      padding: "5px 12px",
                      borderRadius: 10,
                      backgroundColor: "rgba(245, 158, 11, 0.92)",
                      color: "#ffffff",
                      fontSize: 11.5,
                      fontWeight: 800,
                      boxShadow: "0 8px 18px rgba(245, 158, 11, 0.4)",
                    }}
                  >
                    <span>d⃗₁: Ord. 046 Sec. 2 (Omnibus Agreement)</span>
                  </div>

                  {/* Angular Arc Callout Pill */}
                  {vectorAngleArc > 0.6 && (
                    <div
                      style={{
                        position: "absolute",
                        top: 148,
                        left: 350,
                        padding: "4px 10px",
                        borderRadius: 8,
                        backgroundColor: "#064e3b",
                        border: "1.5px solid #34d399",
                        color: "#6ee7b7",
                        fontSize: 10.5,
                        fontWeight: 800,
                        fontFamily: THEME.fontMono,
                        boxShadow: "0 6px 14px rgba(0,0,0,0.4)",
                      }}
                    >
                      θ = 12.4° · cos(θ) = 0.942 [HIGH MATCH]
                    </div>
                  )}

                  {/* Math Formula Overlay at bottom of canvas */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: 8,
                      left: 10,
                      right: 10,
                      padding: "6px 12px",
                      borderRadius: 10,
                      backgroundColor: "rgba(15, 23, 42, 0.88)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: 11,
                      color: "#cbd5e1",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: "#38bdf8", fontWeight: 800, fontFamily: THEME.fontMono }}>
                        cos(θ) = (q · d) / (||q|| ||d||) = 0.942
                      </span>
                      <span>· Inner dot product across 384 dimensions</span>
                    </div>
                    <span style={{ color: "#34d399", fontWeight: 700 }}>
                      ✓ Matches Fiscal Borrowing Concept without exact wording
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    padding: "8px 14px",
                    borderRadius: 10,
                    backgroundColor: THEME.civic50,
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12,
                    fontWeight: 700,
                    color: THEME.civic800,
                  }}
                >
                  <span>Convex Vector Index (Cosine Distance Metric)</span>
                  <span style={{ fontFamily: THEME.fontMono }}>Sub-50ms CPU Query Embedding &amp; Retrieval</span>
                </div>
              </div>

              {/* Col 2: Lexical Reranker & Live Re-Ordering */}
              <div
                style={{
                  backgroundColor: THEME.paper,
                  border: `2px solid ${THEME.civic600}`,
                  borderRadius: 20,
                  padding: "18px 22px",
                  boxShadow: "0 18px 40px -16px rgba(20, 104, 58, 0.2)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: THEME.civic700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    ENGINE 4 · BILINGUAL LEXICAL RERANKER
                  </div>
                  <div style={{ fontFamily: THEME.fontSerif, fontSize: 22, fontWeight: 700, color: THEME.ink950, marginTop: 4 }}>
                    Hybrid Score Fusion &amp; Live Re-Ordering
                  </div>
                </div>

                {/* Score Breakdown Card */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ padding: "8px 12px", borderRadius: 10, backgroundColor: THEME.bg, border: `1px solid ${THEME.border}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: THEME.ink900 }}>
                      <span>Dense Vector Cosine (Weight 0.72)</span>
                      <span style={{ fontFamily: THEME.fontMono, color: THEME.civic700 }}>0.72 × 0.942 = 0.678</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 999, backgroundColor: THEME.secondaryBg, marginTop: 5, overflow: "hidden" }}>
                      <div style={{ width: "67.8%", height: "100%", backgroundColor: THEME.civic600 }} />
                    </div>
                  </div>

                  <div style={{ padding: "8px 12px", borderRadius: 10, backgroundColor: THEME.bg, border: `1px solid ${THEME.border}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: THEME.ink900 }}>
                      <span>Heading Match (&quot;Land Bank&quot;) (Weight 0.28)</span>
                      <span style={{ fontFamily: THEME.fontMono, color: THEME.gold700 }}>+0.28 × 0.95 = +0.266</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 999, backgroundColor: THEME.secondaryBg, marginTop: 5, overflow: "hidden" }}>
                      <div style={{ width: "95%", height: "100%", backgroundColor: THEME.gold500 }} />
                    </div>
                  </div>

                  <div style={{ padding: "6px 12px", borderRadius: 10, backgroundColor: THEME.emerald50, border: `1px solid ${THEME.civic200}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: THEME.emerald800 }}>Combined Fused Grounding Score</span>
                    <span style={{ fontSize: 13, fontWeight: 900, fontFamily: THEME.fontMono, color: THEME.emerald700 }}>0.944 [TOP RANK]</span>
                  </div>
                </div>

                {/* Live Animated Re-Ordering Area */}
                <div style={{ position: "relative", height: 160 }}>
                  {/* Winner Card: Leaps from #2 to #1 */}
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top: interpolate(swapProgress, [0, 1], [56, 2]),
                      padding: "10px 14px",
                      borderRadius: 12,
                      backgroundColor: THEME.civic50,
                      border: `2px solid ${THEME.civic600}`,
                      boxShadow: "0 8px 20px -8px rgba(20, 104, 58, 0.3)",
                      zIndex: 10,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12.5, fontWeight: 800, color: THEME.civic800 }}>
                        #1 · Ord. No. 046, S. 2025 · Sec. 2 (Authority)
                      </span>
                      <span style={{ padding: "2px 8px", borderRadius: 999, backgroundColor: THEME.civic600, color: "#ffffff", fontSize: 10.5, fontWeight: 800 }}>
                        Top Ranked [1]
                      </span>
                    </div>
                    <div style={{ fontSize: 11.5, color: THEME.ink700, marginTop: 3 }}>
                      Municipal Mayor authorized to sign Omnibus Term Agreement with Land Bank (Page 3)
                    </div>
                  </div>

                  {/* Second Card: Drops from #1 to #2 */}
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top: interpolate(swapProgress, [0, 1], [2, 60]),
                      padding: "9px 14px",
                      borderRadius: 12,
                      backgroundColor: THEME.paper,
                      border: `1px solid ${THEME.border}`,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: THEME.ink800 }}>
                        #2 · Ord. No. 046, S. 2025 · Sec. 1 (Title)
                      </span>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: THEME.ink500 }}>Citation [2]</span>
                    </div>
                    <div style={{ fontSize: 11, color: THEME.ink500, marginTop: 2 }}>
                      Ordinance Granting Authority to the Municipal Mayor for Land Bank Agreement
                    </div>
                  </div>

                  {/* Third Card */}
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top: 112,
                      padding: "8px 14px",
                      borderRadius: 12,
                      backgroundColor: THEME.paper,
                      border: `1px solid ${THEME.border}`,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: THEME.ink700 }}>
                        #3 · Ord. No. 046, S. 2025 · Sec. 3 (Limitation)
                      </span>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: THEME.ink400 }}>Citation [3]</span>
                    </div>
                    <div style={{ fontSize: 11, color: THEME.ink500, marginTop: 2 }}>
                      Authority limited to terms in Omnibus Agreement (Page 3)
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    padding: "8px 12px",
                    borderRadius: 10,
                    backgroundColor: THEME.emerald50,
                    border: `1px solid ${THEME.civic200}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: THEME.emerald700,
                  }}
                >
                  <span>✓ Grounded Citations [1] [2] directly linked to PDF Page 3</span>
                  <span>Sub-Second CPU</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== STAGE 4: ANIMATED THREE-TIER ARCHITECTURE & VISIBLE TECH LOGOS ==================== */}
        {stage === 4 && (
          <div style={{ flex: 1, marginTop: 14, display: "flex", flexDirection: "column", gap: 14, perspective: 1200 }}>
            {/* 3-Tier Grid */}
            <div
              style={{
                flex: 1,
                display: "grid",
                gridTemplateColumns: "1fr 90px 1.08fr 90px 1fr",
                alignItems: "stretch",
              }}
            >
              {/* Tier 1 Node: Presentation */}
              <div
                style={{
                  backgroundColor: THEME.paper,
                  border: `2px solid ${THEME.civic600}`,
                  borderRadius: 22,
                  padding: "20px 20px",
                  boxShadow: "0 20px 44px -16px rgba(20, 104, 58, 0.2)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transform: "perspective(1000px) rotateY(2.5deg)",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ padding: "4px 10px", borderRadius: 999, backgroundColor: THEME.civic50, color: THEME.civic700, fontSize: 11, fontWeight: 800 }}>
                      TIER 1 · PRESENTATION
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: THEME.ink500 }}>Client Layer</span>
                  </div>

                  {/* Prominent Tech Badges */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 8, backgroundColor: "#000000", color: "#ffffff" }}>
                      <Img src={staticFile("tech/nextjs.svg")} style={{ width: 18, height: 18, filter: "invert(1)" }} />
                      <span style={{ fontSize: 12, fontWeight: 800 }}>Next.js 15</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 8, backgroundColor: "#087ea4", color: "#ffffff" }}>
                      <Img src={staticFile("tech/react.svg")} style={{ width: 18, height: 18 }} />
                      <span style={{ fontSize: 12, fontWeight: 800 }}>React 19</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 9px", borderRadius: 8, backgroundColor: "#3178c6", color: "#ffffff" }}>
                      <Img src={staticFile("tech/typescript.svg")} style={{ width: 16, height: 16 }} />
                      <span style={{ fontSize: 11.5, fontWeight: 700 }}>TypeScript</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 9px", borderRadius: 8, backgroundColor: "#0ea5e9", color: "#ffffff" }}>
                      <Img src={staticFile("tech/tailwindcss.svg")} style={{ width: 16, height: 16 }} />
                      <span style={{ fontSize: 11.5, fontWeight: 700 }}>Tailwind</span>
                    </div>
                  </div>

                  <h3 style={{ fontFamily: THEME.fontSerif, fontSize: 23, fontWeight: 700, color: THEME.ink950, margin: "12px 0 4px 0" }}>
                    Next.js 15 &amp; React 19
                  </h3>
                  <p style={{ fontSize: 12.5, color: THEME.ink600, margin: "0 0 10px 0" }}>
                    Public Search Workspace &amp; Authenticated Admin Portal
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {[
                      "Plain-Language Search Composer",
                      "Slide-Over [1] Parsed Section Inspector",
                      "Admin Ingestion & Benchmark UI",
                    ].map((it) => (
                      <div key={it} style={{ padding: "7px 11px", borderRadius: 9, backgroundColor: THEME.bg, border: `1px solid ${THEME.border}`, fontSize: 12, fontWeight: 600, color: THEME.ink800 }}>
                        {it}
                      </div>
                    ))}
                  </div>

                  {/* Flow Callout Box */}
                  <div style={{ marginTop: 10, padding: "9px 12px", borderRadius: 10, backgroundColor: THEME.civic50, border: `1.5px dashed ${THEME.civic300}` }}>
                    <div style={{ fontSize: 10.5, fontWeight: 800, color: THEME.civic800, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      User Interaction Pathway
                    </div>
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: THEME.ink800, marginTop: 4 }}>
                      Search Input → Instant Candidate Retrieval → Direct PDF Deep Link
                    </div>
                  </div>

                  {/* Micro Chips */}
                  <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                    {["Sub-Second UI", "Zero Tracking", "Responsive"].map((chip) => (
                      <span key={chip} style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 8px", borderRadius: 6, backgroundColor: THEME.bg, border: `1px solid ${THEME.border}`, color: THEME.ink700 }}>
                        ✓ {chip}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: THEME.civic700, marginTop: 8 }}>
                  httpOnly Session Cookie Auth
                </div>
              </div>

              {/* Animated Connector 1 -> 2 */}
              <div style={{ position: "relative", height: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: "100%", height: 4, backgroundColor: THEME.civic200, borderRadius: 999 }} />
                <div
                  style={{
                    position: "absolute",
                    left: `${(packetPos / 320) * 85}%`,
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    backgroundColor: THEME.civic600,
                    boxShadow: "0 0 14px rgba(20, 104, 58, 0.7)",
                  }}
                />
                <span style={{ position: "absolute", top: -8, fontSize: 10, fontWeight: 800, color: THEME.ink600, fontFamily: THEME.fontMono }}>
                  REST JSON
                </span>
              </div>

              {/* Tier 2 Node: Hero Application & AI */}
              <div
                style={{
                  backgroundColor: THEME.paper,
                  border: `2.5px solid ${THEME.civic600}`,
                  borderRadius: 22,
                  padding: "20px 20px",
                  boxShadow: "0 28px 60px -20px rgba(20, 104, 58, 0.3)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transform: `perspective(1000px) scale(${1 + 0.012 * Math.sin(frame / 14)}) translateZ(12px)`,
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ padding: "4px 10px", borderRadius: 999, backgroundColor: THEME.civic600, color: "#ffffff", fontSize: 11, fontWeight: 800 }}>
                      TIER 2 · APPLICATION &amp; AI
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: THEME.emerald700 }}>Zero GPU Required</span>
                  </div>

                  {/* Prominent Tech Badges */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 11px", borderRadius: 8, backgroundColor: "#059669", color: "#ffffff" }}>
                      <Img src={staticFile("tech/fastapi.png")} style={{ width: 22, height: 22, objectFit: "contain" }} />
                      <span style={{ fontSize: 12.5, fontWeight: 800 }}>FastAPI</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 11px", borderRadius: 8, backgroundColor: "#1e293b", color: "#ffffff" }}>
                      <Img src={staticFile("tech/python.svg")} style={{ width: 20, height: 20 }} />
                      <span style={{ fontSize: 12.5, fontWeight: 800 }}>Python 3.12</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 11px", borderRadius: 8, backgroundColor: "#ff9d00", color: "#000000" }}>
                      <Img src={staticFile("tech/huggingface.svg")} style={{ width: 20, height: 20 }} />
                      <span style={{ fontSize: 12.5, fontWeight: 800 }}>FastEmbed</span>
                    </div>
                  </div>

                  <h3 style={{ fontFamily: THEME.fontSerif, fontSize: 23, fontWeight: 700, color: THEME.ink950, margin: "12px 0 4px 0" }}>
                    Python FastAPI Engine
                  </h3>
                  <p style={{ fontSize: 12.5, color: THEME.ink600, margin: "0 0 10px 0" }}>
                    100% CPU-Optimized Neural Search on Standard LGU PCs
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {[
                      "PyMuPDF + Bilingual OCR Spell Repair (eng+fil)",
                      "Section Slicer & Wet-Signature Isolation",
                      "FastEmbed BAAI/bge-small-en-v1.5 (384-d)",
                    ].map((it) => (
                      <div key={it} style={{ padding: "7px 11px", borderRadius: 9, backgroundColor: THEME.civic50, border: `1px solid ${THEME.civic200}`, fontSize: 12, fontWeight: 600, color: THEME.civic900 }}>
                        {it}
                      </div>
                    ))}
                  </div>

                  {/* Flow Callout Box */}
                  <div style={{ marginTop: 10, padding: "9px 12px", borderRadius: 10, backgroundColor: "#f0fdf4", border: `1.5px dashed ${THEME.emerald500}` }}>
                    <div style={{ fontSize: 10.5, fontWeight: 800, color: THEME.emerald800, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      CPU Latency Profile
                    </div>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: THEME.emerald900, marginTop: 4 }}>
                      Embedding: &lt;35ms · Reranking: &lt;15ms · Total Response: &lt;0.85s
                    </div>
                  </div>

                  {/* Micro Chips */}
                  <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                    {["BAAI 384-d", "Cosine Search", "Bilingual Lexer"].map((chip) => (
                      <span key={chip} style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 8px", borderRadius: 6, backgroundColor: "#f0fdf4", border: `1px solid ${THEME.civic200}`, color: THEME.civic900 }}>
                        ✓ {chip}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: THEME.civic700, marginTop: 8 }}>
                  4 Configurable Retrieval Engines
                </div>
              </div>

              {/* Animated Connector 2 -> 3 */}
              <div style={{ position: "relative", height: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: "100%", height: 4, backgroundColor: THEME.civic200, borderRadius: 999 }} />
                <div
                  style={{
                    position: "absolute",
                    left: `${(packetPos / 320) * 85}%`,
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    backgroundColor: THEME.gold500,
                    boxShadow: "0 0 14px rgba(217, 119, 6, 0.7)",
                  }}
                />
                <span style={{ position: "absolute", top: -8, fontSize: 10, fontWeight: 800, color: THEME.ink600, fontFamily: THEME.fontMono }}>
                  Convex + SQL
                </span>
              </div>

              {/* Tier 3 Node: Data & Indexing */}
              <div
                style={{
                  backgroundColor: THEME.paper,
                  border: `2px solid ${THEME.civic600}`,
                  borderRadius: 22,
                  padding: "20px 20px",
                  boxShadow: "0 20px 44px -16px rgba(20, 104, 58, 0.2)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transform: "perspective(1000px) rotateY(-2.5deg)",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ padding: "4px 10px", borderRadius: 999, backgroundColor: THEME.gold100, color: THEME.gold700, fontSize: 11, fontWeight: 800 }}>
                      TIER 3 · CONVEX &amp; LOCAL INDEX
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: THEME.ink500 }}>Dual Store</span>
                  </div>

                  {/* Prominent Tech Badges */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 11px", borderRadius: 8, backgroundColor: "#fff1f2", border: "1.5px solid #ee3424" }}>
                      <Img src={staticFile("tech/convex.svg")} style={{ width: 22, height: 22, objectFit: "contain" }} />
                      <span style={{ fontSize: 12.5, fontWeight: 900, color: "#ee3424" }}>Convex DB</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 11px", borderRadius: 8, backgroundColor: "#eff6ff", border: "1.5px solid #003B57" }}>
                      <Img src={staticFile("tech/sqlite.svg")} style={{ width: 22, height: 22, objectFit: "contain" }} />
                      <span style={{ fontSize: 12.5, fontWeight: 900, color: "#003B57" }}>SQLite FTS5</span>
                    </div>
                  </div>

                  <h3 style={{ fontFamily: THEME.fontSerif, fontSize: 23, fontWeight: 700, color: THEME.ink950, margin: "12px 0 4px 0" }}>
                    Convex &amp; SQLite FTS5
                  </h3>
                  <p style={{ fontSize: 12.5, color: THEME.ink600, margin: "0 0 10px 0" }}>
                    Reactive Cloud Store, 384-d Vector Index &amp; PDF Vault
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {[
                      "Convex documents, sections & chunks (384-d)",
                      "Convex chat_sessions & audit_logs",
                      "Admin-Only Checksummed PDF Vault (SHA-256)",
                    ].map((it) => (
                      <div key={it} style={{ padding: "7px 11px", borderRadius: 9, backgroundColor: THEME.bg, border: `1px solid ${THEME.border}`, fontSize: 12, fontWeight: 600, color: THEME.ink800 }}>
                        {it}
                      </div>
                    ))}
                  </div>

                  {/* Flow Callout Box */}
                  <div style={{ marginTop: 10, padding: "9px 12px", borderRadius: 10, backgroundColor: THEME.gold50, border: `1.5px dashed ${THEME.gold500}` }}>
                    <div style={{ fontSize: 10.5, fontWeight: 800, color: THEME.gold700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Dual Storage &amp; Integrity
                    </div>
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: THEME.ink800, marginTop: 4 }}>
                      Reactive WebSocket Sync + Tamper-Proof SHA-256 PDF Vault
                    </div>
                  </div>

                  {/* Micro Chips */}
                  <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                    {["Reactive State", "BM25 Inverted", "SHA-256 Vault"].map((chip) => (
                      <span key={chip} style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 8px", borderRadius: 6, backgroundColor: THEME.gold50, border: `1px solid ${THEME.gold500}`, color: THEME.gold700 }}>
                        ✓ {chip}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: THEME.gold700, marginTop: 8 }}>
                  Wet-Signature &amp; Raw PDF Protection
                </div>
              </div>
            </div>

            {/* Bottom Tech Stack Full-Width Recognition Ribbon */}
            <div
              style={{
                backgroundColor: THEME.paper,
                borderRadius: 16,
                padding: "10px 22px",
                border: `1.5px solid ${THEME.border}`,
                boxShadow: "0 6px 18px -6px rgba(0,0,0,0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 900, color: THEME.civic700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Official Tech Stack:
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                {[
                  { name: "Next.js 15", src: "tech/nextjs.svg", color: "#000000", invert: true, role: "App Router" },
                  { name: "React 19", src: "tech/react.svg", color: "#087ea4", role: "Components" },
                  { name: "TypeScript", src: "tech/typescript.svg", color: "#3178c6", role: "Strict Types" },
                  { name: "FastAPI", src: "tech/fastapi.png", color: "#059669", isPng: true, role: "Async REST" },
                  { name: "Python 3.12", src: "tech/python.svg", color: "#1e293b", role: "OCR Pipeline" },
                  { name: "FastEmbed", src: "tech/huggingface.svg", color: "#ff9d00", role: "BAAI 384-d" },
                  { name: "Convex", src: "tech/convex.svg", color: "#ee3424", role: "Vector DB" },
                  { name: "SQLite FTS5", src: "tech/sqlite.svg", color: "#003B57", role: "BM25 Index" },
                ].map((t) => (
                  <div key={t.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 7,
                        backgroundColor: t.isPng ? "transparent" : t.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: t.isPng ? 0 : 3.5,
                        boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
                      }}
                    >
                      <Img
                        src={staticFile(t.src)}
                        style={{
                          width: t.isPng ? 26 : 19,
                          height: t.isPng ? 26 : 19,
                          objectFit: "contain",
                          filter: t.invert ? "invert(1)" : "none",
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 800, color: THEME.ink950 }}>{t.name}</span>
                    <span style={{ fontSize: 11, color: THEME.ink500, fontFamily: THEME.fontMono }}>({t.role})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      <TeleprompterBar ticks={TELEPROMPTER_TICKS.METHODOLOGY} />
    </AbsoluteFill>
  );
};
