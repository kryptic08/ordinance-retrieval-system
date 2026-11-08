import React from "react";
import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import {
  FileCheck2,
  Scale,
  Database,
  GraduationCap,
  ShieldCheck,
  Search,
  SlidersHorizontal,
  SendHorizonal,
  FileText,
  Sparkles,
} from "lucide-react";
import { THEME, RESEARCHERS, TELEPROMPTER_TICKS } from "../constants";
import { TopHeaderBar, TeleprompterBar } from "../components/SharedUI";

export const SceneIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentSec = frame / fps;

  const ticks = TELEPROMPTER_TICKS.INTRO;
  const t1 = ticks[1]?.startSec ?? 9;
  const t2 = ticks[2]?.startSec ?? 18;
  const t3 = ticks[3]?.startSec ?? 28;
  const t4 = ticks[4]?.startSec ?? 38;

  const isResearchersPhase = currentSec >= t3;

  const sealPop = spring({ frame, fps, config: { damping: 12, stiffness: 100 } });
  const titleUp = spring({ frame: Math.max(0, frame - 8), fps, config: { damping: 14, stiffness: 110 } });
  const binderPop = spring({
    frame: Math.max(0, frame - Math.round(t1 * fps)),
    fps,
    config: { damping: 14, stiffness: 110 },
  });
  const searchBarPop = spring({
    frame: Math.max(0, frame - Math.round(t2 * fps)),
    fps,
    config: { damping: 14, stiffness: 110 },
  });

  const floatY = Math.sin(frame / 20) * 4;

  // Dynamic typing inside the hero search bar during Tick 2
  const demoQuery = "Who is authorized to borrow funds for the sanitary landfill?";
  const typedLen =
    currentSec < t2
      ? 0
      : Math.min(
          demoQuery.length,
          Math.floor(((currentSec - t2) / Math.max(2.5, (t3 - t2) * 0.65)) * demoQuery.length)
        );
  const activeQueryText =
    currentSec >= t2
      ? demoQuery.slice(0, typedLen)
      : "Search Polangui's enacted ordinances in plain English or Filipino...";

  const realOrdinances = [
    {
      code: "Ordinance No. 046, S. 2025",
      title: "Php 50M Land Bank Borrowing · Sanitary Landfill",
      pages: "16 Scanned Pages · 4 Sections",
    },
    {
      code: "Ordinance No. 11-062, S. 2025",
      title: "Maternal & Child Nutrition Law (First 1,000 Days)",
      pages: "35 Scanned Pages · 43 Sections",
    },
    {
      code: "Ordinance No. 11-063, S. 2025",
      title: "Creating RRBWASA Barangay Waterworks Association",
      pages: "30 Scanned Pages · 46 Sections",
    },
  ];

  // Subtle, balanced cinematic camera push-in across Intro (Max 1.05x, perfectly centered)
  const cameraZoom = interpolate(
    currentSec,
    [0, 7.5, 9, 17, 18.5, 27, 28, 29, 35, 37, 43, 44],
    [1.0, 1.02, 1.04, 1.04, 1.05, 1.05, 1.01, 1.04, 1.04, 1.04, 1.0, 1.0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const cameraOriginX = 50;
  const cameraOriginY = 50;

  const cameraTiltX = interpolate(
    currentSec,
    [0, 9, 18.5, 29, 37, 44],
    [0, 0.2, -0.2, 0.2, -0.2, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const cameraTiltY = interpolate(
    currentSec,
    [0, 9, 18.5, 29, 37, 44],
    [0, -0.2, 0.2, -0.2, 0.2, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: THEME.bg,
        backgroundImage: `radial-gradient(circle at 20% 20%, rgba(30, 130, 76, 0.08), transparent 45%), radial-gradient(circle at 80% 0%, rgba(217, 119, 6, 0.06), transparent 35%)`,
        fontFamily: THEME.fontSans,
        color: THEME.ink900,
      }}
    >
      <TopHeaderBar activeTab="Search" />

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
        {!isResearchersPhase ? (
        /* PHASE 1 (Ticks 0 - 2): Municipal Legislative Context -> OrdiSearch Solution */
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 80px 90px 80px",
            textAlign: "center",
          }}
        >
          {/* Official Polangui Seal Circle */}
          <div
            style={{
              width: 100,
              height: 100,
              borderRadius: "50%",
              border: "2px solid rgba(217, 119, 6, 0.45)",
              backgroundColor: THEME.paper,
              padding: 6,
              boxShadow: "0 18px 40px -18px rgba(15, 23, 42, 0.22)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: `scale(${sealPop}) translateY(${floatY}px)`,
              marginBottom: 12,
            }}
          >
            <Img
              src={staticFile("logo.png")}
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </div>

          {/* Jurisdiction Pill Badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              borderRadius: 999,
              border: `1px solid ${THEME.borderStrong}`,
              backgroundColor: THEME.paper,
              padding: "6px 14px",
              boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
              marginBottom: 12,
              opacity: titleUp,
              transform: `translateY(${interpolate(titleUp, [0, 1], [14, 0])}px)`,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: THEME.civic500,
              }}
            />
            <span
              style={{
                fontFamily: THEME.fontMono,
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                color: THEME.civic700,
              }}
            >
              Municipality of Polangui · Albay · Sangguniang Bayan
            </span>
          </div>

          {/* Brand Title */}
          <h1
            style={{
              fontFamily: THEME.fontSerif,
              fontSize: 58,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              color: THEME.ink950,
              margin: 0,
              lineHeight: 1.05,
              opacity: titleUp,
              transform: `translateY(${interpolate(titleUp, [0, 1], [20, 0])}px)`,
            }}
          >
            OrdiSearch<span style={{ color: THEME.civic600 }}>.</span>
          </h1>

          {/* Subtitle */}
          <p
            style={{
              marginTop: 10,
              marginBottom: 20,
              maxWidth: 760,
              fontSize: 17.5,
              color: THEME.ink600,
              lineHeight: 1.45,
              opacity: titleUp,
              transform: `translateY(${interpolate(titleUp, [0, 1], [24, 0])}px)`,
            }}
          >
            A Vector Search-Based Local Ordinance and Policy Retrieval System Developed in Collaboration with the Local Government Unit of Polangui
          </p>

          {/* Animated Real Polangui Ordinance Cards (Visible in Tick 0 & Tick 1, morphs into Search Focus in Tick 2) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 16,
              width: "100%",
              maxWidth: 1060,
              marginBottom: 20,
            }}
          >
            {realOrdinances.map((ord, idx) => {
              const cardPop = spring({
                frame: Math.max(0, frame - (16 + idx * 8)),
                fps,
                config: { damping: 14, stiffness: 110 },
              });
              const isScannedHighlight = currentSec >= t1 && currentSec < t2;
              const isIndexedHighlight = currentSec >= t2;

              return (
                <div
                  key={ord.code}
                  style={{
                    opacity: cardPop,
                    transform: `perspective(800px) translateY(${interpolate(cardPop, [0, 1], [18, 0])}px) rotateY(${
                      idx === 0 ? 2 : idx === 2 ? -2 : 0
                    }deg) translateZ(${isScannedHighlight || isIndexedHighlight ? 14 : 0}px)`,
                    backgroundColor: THEME.paper,
                    borderRadius: 14,
                    border: isIndexedHighlight
                      ? `1.5px solid ${THEME.civic600}`
                      : isScannedHighlight
                      ? `1.5px solid ${THEME.gold500}`
                      : `1px solid ${THEME.border}`,
                    padding: "12px 16px",
                    textAlign: "left",
                    boxShadow: isIndexedHighlight || isScannedHighlight
                      ? "0 18px 36px -14px rgba(20, 104, 58, 0.22)"
                      : "0 8px 22px -14px rgba(15, 23, 42, 0.12)",
                    transformStyle: "preserve-3d",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        fontSize: 11,
                        fontWeight: 800,
                        color: isIndexedHighlight ? THEME.civic700 : THEME.ink700,
                      }}
                    >
                      <FileText size={13} color={isIndexedHighlight ? THEME.civic600 : THEME.gold500} />
                      {ord.code}
                    </span>
                    <span
                      style={{
                        padding: "2px 7px",
                        borderRadius: 999,
                        backgroundColor: isIndexedHighlight
                          ? THEME.emerald50
                          : isScannedHighlight
                          ? THEME.gold50
                          : THEME.secondaryBg,
                        color: isIndexedHighlight
                          ? THEME.emerald700
                          : isScannedHighlight
                          ? THEME.gold700
                          : THEME.ink600,
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    >
                      {isIndexedHighlight ? "✓ Vector Indexed" : isScannedHighlight ? "Scanned PDF Binder" : "Enacted 2025"}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink900, lineHeight: 1.3 }}>
                    {ord.title}
                  </div>
                  <div style={{ fontSize: 11, color: THEME.ink500, marginTop: 4, fontWeight: 600 }}>
                    {ord.pages}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Search Bar Preview (Interactive focus in Tick 2) */}
          <div
            style={{
              width: "100%",
              maxWidth: 860,
              borderRadius: 18,
              border: currentSec >= t2 ? `2px solid ${THEME.civic600}` : `1.5px solid ${THEME.civic300}`,
              backgroundColor: THEME.paper,
              padding: "14px 20px",
              boxShadow:
                currentSec >= t2
                  ? "0 20px 44px -14px rgba(20, 104, 58, 0.25)"
                  : "0 12px 28px -14px rgba(20, 104, 58, 0.14)",
              textAlign: "left",
              transform: `scale(${currentSec >= t2 ? interpolate(searchBarPop, [0, 1], [0.98, 1.02]) : 1})`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Search size={20} color={THEME.civic600} />
              <div
                style={{
                  flex: 1,
                  fontSize: 16,
                  color: currentSec >= t2 ? THEME.ink950 : THEME.ink500,
                  fontWeight: currentSec >= t2 ? 600 : 500,
                }}
              >
                {activeQueryText}
                {currentSec >= t2 && (
                  <span
                    style={{
                      display: "inline-block",
                      width: 2,
                      height: 18,
                      backgroundColor: THEME.civic600,
                      marginLeft: 3,
                      verticalAlign: "middle",
                      opacity: Math.floor(frame / 8) % 2 === 0 ? 1 : 0,
                    }}
                  />
                )}
              </div>
            </div>

            <div
              style={{
                marginTop: 10,
                paddingTop: 10,
                borderTop: `1px solid ${THEME.secondaryBg}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 10px",
                    borderRadius: 8,
                    border: `1px solid ${THEME.border}`,
                    backgroundColor: THEME.bg,
                    fontSize: 12,
                    fontWeight: 600,
                    color: THEME.ink800,
                  }}
                >
                  <SlidersHorizontal size={12} color={THEME.civic700} />
                  Hybrid + Rerank
                </span>
                <span style={{ fontSize: 12, color: THEME.civic700, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Sparkles size={12} /> Bilingual OCR + 384-d Semantic Search
                </span>
              </div>

              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 18px",
                  borderRadius: 12,
                  backgroundColor: THEME.civic600,
                  color: "#ffffff",
                  fontSize: 13,
                  fontWeight: 600,
                  boxShadow: "0 4px 12px rgba(20, 104, 58, 0.28)",
                }}
              >
                <span>Search Ordinances</span>
                <SendHorizonal size={14} />
              </div>
            </div>
          </div>

          {/* Bottom Authentic Corpus Indicators */}
          <div
            style={{
              marginTop: 18,
              display: "flex",
              alignItems: "center",
              gap: 22,
              fontSize: 13,
              fontWeight: 500,
              color: THEME.ink600,
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <FileCheck2 size={15} color={THEME.civic700} />
              <strong style={{ color: THEME.ink900 }}>3</strong> Enacted Polangui Ordinances (81 Pages)
            </span>
            <span style={{ color: THEME.ink300 }}>·</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Scale size={15} color={THEME.civic700} />
              <strong style={{ color: THEME.ink900 }}>93</strong> Parsed Statutory Sections
            </span>
            <span style={{ color: THEME.ink300 }}>·</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Database size={15} color={THEME.civic700} />
              <strong style={{ color: THEME.ink900 }}>193</strong> 384-d Vector Chunks
            </span>
          </div>
        </div>
      ) : (
        /* PHASE 2 (Ticks 3 - 4): Meet the Researchers (Bicol University Polangui) */
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 80px 95px 80px",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              borderRadius: 999,
              border: "1px solid rgba(20, 104, 58, 0.22)",
              backgroundColor: THEME.civic50,
              padding: "6px 16px",
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: THEME.civic800,
              marginBottom: 10,
            }}
          >
            <GraduationCap size={15} color={THEME.civic700} strokeWidth={2.2} />
            Bicol University Polangui · In Collaboration with LGU Polangui
          </div>

          <h2
            style={{
              fontFamily: THEME.fontSerif,
              fontSize: 46,
              fontWeight: 700,
              color: THEME.ink950,
              margin: "0 0 28px 0",
              letterSpacing: "-0.02em",
            }}
          >
            Meet the Research Team
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 28,
              width: "100%",
              maxWidth: 1420,
            }}
          >
            {RESEARCHERS.map((r, idx) => {
              const cardEnterFrame = Math.round(t3 * fps) + idx * 10;
              const cardPop = spring({
                frame: Math.max(0, frame - cardEnterFrame),
                fps,
                config: { damping: 13, stiffness: 110 },
              });

              const midTick3 = t3 + (t4 - t3) * 0.52;
              const isHighlighted =
                (idx === 0 && currentSec >= t3 && currentSec < midTick3) ||
                (idx === 1 && currentSec >= midTick3 && currentSec < t4) ||
                (idx === 2 && currentSec >= t4);

              return (
                <div
                  key={r.name}
                  style={{
                    backgroundColor: THEME.paper,
                    borderRadius: 24,
                    border: isHighlighted
                      ? `2.5px solid ${THEME.civic600}`
                      : `1px solid ${THEME.border}`,
                    padding: "32px 24px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    boxShadow: isHighlighted
                      ? "0 32px 64px -16px rgba(20, 104, 58, 0.38)"
                      : "0 12px 32px -20px rgba(15, 23, 42, 0.1)",
                    opacity: cardPop,
                    transform: `perspective(1000px) translateY(${interpolate(cardPop, [0, 1], [30, 0])}px) scale(${
                      isHighlighted ? 1.05 : 1.0
                    }) rotateY(${idx === 0 ? 3 : idx === 2 ? -3 : 0}deg) translateZ(${isHighlighted ? 22 : 0}px)`,
                    transformStyle: "preserve-3d",
                    position: "relative",
                    overflow: "hidden",
                    transition: "all 0.25s ease-out",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: isHighlighted ? 6 : 4,
                      backgroundColor: isHighlighted ? THEME.civic600 : THEME.civic200,
                    }}
                  />

                  <div
                    style={{
                      width: 176,
                      height: 176,
                      borderRadius: "50%",
                      overflow: "hidden",
                      border: isHighlighted
                        ? `4px solid ${THEME.civic600}`
                        : `3px solid ${THEME.civic200}`,
                      boxShadow: "0 14px 28px -14px rgba(15, 23, 42, 0.22)",
                      marginBottom: 18,
                      backgroundColor: THEME.secondaryBg,
                    }}
                  >
                    <Img
                      src={staticFile(r.photo)}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        filter: isHighlighted ? "none" : "brightness(0.95)",
                      }}
                    />
                  </div>

                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "4px 12px",
                      borderRadius: 999,
                      backgroundColor: isHighlighted ? THEME.civic600 : THEME.secondaryBg,
                      color: isHighlighted ? "#ffffff" : THEME.ink600,
                      fontSize: 12,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginBottom: 10,
                    }}
                  >
                    <ShieldCheck size={13} />
                    Researcher
                  </div>

                  <h3
                    style={{
                      fontFamily: THEME.fontSerif,
                      fontSize: 28,
                      fontWeight: 700,
                      color: THEME.ink950,
                      margin: "0 0 6px 0",
                    }}
                  >
                    {r.name}
                  </h3>

                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: THEME.civic700,
                      marginBottom: 6,
                    }}
                  >
                    Bicol University Polangui
                  </div>

                  <div
                    style={{
                      fontSize: 12.5,
                      color: THEME.ink500,
                      fontWeight: 500,
                    }}
                  >
                    In Collaboration with LGU Polangui
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      </div>

      <TeleprompterBar ticks={TELEPROMPTER_TICKS.INTRO} />
    </AbsoluteFill>
  );
};
