import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import {
  FileText,
  XCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  Languages,
} from "lucide-react";
import { THEME, TELEPROMPTER_TICKS } from "../constants";
import { TopHeaderBar, TeleprompterBar } from "../components/SharedUI";

export const SceneProblem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sec = frame / fps;

  const ticks = TELEPROMPTER_TICKS.PROBLEM;
  const t1 = ticks[1]?.startSec ?? 12;
  const t2 = ticks[2]?.startSec ?? 20;
  const t3 = ticks[3]?.startSec ?? 38;
  const t4 = ticks[4]?.startSec ?? 49;
  const t5 = ticks[5]?.startSec ?? 61;

  const isBridgeActive = sec >= t5;
  const elapsedPages = Math.min(81, Math.floor((sec / Math.max(1, t4)) * 81) + 6);
  const pulseDot = (frame * 4) % 460;

  const bridgeSpring = spring({
    frame: Math.max(0, frame - Math.round(fps * t5)),
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  const realPolanguiDocs = [
    {
      title: "Ordinance No. 046, S. 2025 · Php 50M Land Bank Borrowing",
      sub: "16 Scanned Pages · Sanitary Landfill Loan Authority",
      highlight: true,
    },
    {
      title: "Ordinance No. 11-062, S. 2025 · Maternal & Child Nutrition",
      sub: "35 Scanned Pages · First 1,000 Days Health Program",
      highlight: false,
    },
    {
      title: "Ordinance No. 11-063, S. 2025 · RRBWASA Waterworks",
      sub: "30 Scanned Pages · Railroad & Rinconada Barangays",
      highlight: false,
    },
  ];

  // Subtle, balanced cinematic camera push-in across Problem (Max 1.04x, centered)
  const cameraZoom = interpolate(
    sec,
    [0, 11, 13, 25, 27, 45, 47, 58, 60, 71, 73],
    [1.0, 1.0, 1.04, 1.04, 1.04, 1.04, 1.04, 1.04, 1.04, 1.0, 1.0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const cameraOriginX = 50;
  const cameraOriginY = 50;

  const cameraTiltX = interpolate(
    sec,
    [0, 13, 24, 36, 46, 55],
    [0, 0.2, -0.2, 0.2, -0.2, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const cameraTiltY = interpolate(
    sec,
    [0, 13, 24, 36, 46, 55],
    [0, -0.2, 0.2, -0.2, 0.2, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: THEME.bg,
        backgroundImage: `radial-gradient(circle at 15% 15%, rgba(20, 104, 58, 0.06), transparent 36%), radial-gradient(circle at 85% 20%, rgba(217, 119, 6, 0.06), transparent 32%)`,
        fontFamily: THEME.fontSans,
        color: THEME.ink900,
        overflow: "hidden",
      }}
    >
      <TopHeaderBar activeTab="Search" />

      <div
        style={{
          padding: "22px 72px 86px 72px",
          display: "flex",
          flexDirection: "column",
          height: "calc(100% - 64px)",
          justifyContent: "space-between",
          transform: `perspective(1400px) rotateX(${cameraTiltX}deg) rotateY(${cameraTiltY}deg) scale(${cameraZoom})`,
          transformOrigin: `${cameraOriginX}% ${cameraOriginY}%`,
          transformStyle: "preserve-3d",
        }}
      >
        {/* Title Strip */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span
              style={{
                fontSize: 12,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: THEME.gold700,
              }}
            >
              The Legislative Retrieval Challenge in Polangui
            </span>
            <h2
              style={{
                fontFamily: THEME.fontSerif,
                fontSize: 36,
                fontWeight: 700,
                color: THEME.ink950,
                margin: "4px 0 0 0",
              }}
            >
              Why Scanned PDF Binders &amp; Exact Keyword Matching Fall Short
            </h2>
          </div>

          {/* Live Status Pill */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 18px",
              borderRadius: 999,
              backgroundColor: !isBridgeActive ? THEME.rust50 : THEME.emerald50,
              border: `1.5px solid ${!isBridgeActive ? "#fecaca" : THEME.civic200}`,
              color: !isBridgeActive ? THEME.rust700 : THEME.emerald700,
              fontSize: 13.5,
              fontWeight: 800,
            }}
          >
            <Clock size={18} />
            <span>
              {!isBridgeActive
                ? `Manual Scanned PDF Review: ${elapsedPages} / 81 Pages Skimmed`
                : "OrdiSearch Hybrid + Rerank: Section 2 Found in < 200ms"}
            </span>
          </div>
        </div>

        {/* Main 3-Column Educational Motion Graphic */}
        <div
          style={{
            flex: 1,
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: "410px 1fr 440px",
            gap: 24,
            alignItems: "center",
          }}
        >
          {/* LEFT: Real Polangui Scanned Corpus & Citizen Inquiry */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div
              style={{
                backgroundColor: THEME.paper,
                borderRadius: 20,
                border: sec < t2 ? `2px solid ${THEME.gold500}` : `1.5px solid ${THEME.borderStrong}`,
                padding: "16px 20px",
                boxShadow: "0 14px 32px -18px rgba(15, 23, 42, 0.14)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10,
                  paddingBottom: 6,
                  borderBottom: `1px solid ${THEME.border}`,
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 800, color: THEME.ink700, textTransform: "uppercase" }}>
                  1. Polangui Scanned PDF Corpus
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: THEME.gold700,
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Languages size={13} /> English + Filipino Text
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {realPolanguiDocs.map((ord) => (
                  <div
                    key={ord.title}
                    style={{
                      padding: "9px 12px",
                      borderRadius: 10,
                      backgroundColor: ord.highlight ? THEME.gold50 : THEME.secondaryBg,
                      border: `1px solid ${ord.highlight ? THEME.gold500 : THEME.border}`,
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                    }}
                  >
                    <FileText size={15} color={ord.highlight ? THEME.gold700 : THEME.ink500} style={{ marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: THEME.ink900 }}>{ord.title}</div>
                      <div style={{ fontSize: 11, color: THEME.ink600, fontWeight: 500, marginTop: 1 }}>{ord.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Citizen Plain-Language Query Box */}
            <div
              style={{
                padding: "16px 20px",
                borderRadius: 18,
                backgroundColor: THEME.paper,
                border: sec >= t2 ? `2.5px solid ${THEME.civic600}` : `1.5px solid ${THEME.civic300}`,
                boxShadow:
                  sec >= t2
                    ? "0 16px 32px -12px rgba(20, 104, 58, 0.24)"
                    : "0 8px 20px -10px rgba(20, 104, 58, 0.12)",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: THEME.civic700, marginBottom: 6 }}>
                2. Citizen / Staff Plain-Language Question
              </div>
              <div style={{ fontSize: 15.5, fontWeight: 700, color: THEME.ink950, lineHeight: 1.38 }}>
                “Who is authorized to borrow funds for the sanitary landfill?”
              </div>
              <div style={{ fontSize: 11.5, color: THEME.ink500, marginTop: 6, fontWeight: 500 }}>
                Natural phrasing · Does not mention &ldquo;Omnibus Term Agreement&rdquo;
              </div>
            </div>
          </div>

          {/* MIDDLE: The Lexical Mismatch vs. OrdiSearch 384-d Semantic + Lexical Bridge */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Top: Naive Keyword Match Failure */}
            <div
              style={{
                padding: "16px 18px",
                borderRadius: 16,
                backgroundColor: THEME.rust50,
                border: sec >= t3 && sec < t4 ? `2px solid ${THEME.rust600}` : "1.5px solid #fecaca",
                opacity: isBridgeActive ? 0.65 : 1,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: THEME.rust700, textTransform: "uppercase", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <XCircle size={16} /> Naive Keyword Search
                </span>
                <span style={{ padding: "2px 8px", borderRadius: 999, backgroundColor: "#fee2e2", color: THEME.rust700, fontSize: 11, fontWeight: 800 }}>
                  Misses Section 2 Body
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px", height: 58 }}>
                <div style={{ fontFamily: THEME.fontMono, fontSize: 11.5, fontWeight: 700, color: THEME.ink800 }}>
                  &quot;borrow funds&quot;
                  <br />
                  &quot;sanitary landfill&quot;
                </div>

                <div style={{ flex: 1, margin: "0 14px", height: 4, backgroundColor: "#fecaca", position: "relative" }}>
                  <div
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: -12,
                      bottom: -12,
                      width: 4,
                      backgroundColor: THEME.rust600,
                    }}
                  />
                </div>

                <div style={{ fontFamily: THEME.fontMono, fontSize: 11.5, fontWeight: 700, color: THEME.rust700, textAlign: "right" }}>
                  ≠ &quot;Omnibus Term
                  <br />
                  Agreement&quot;
                </div>
              </div>
            </div>

            {/* Bottom: OrdiSearch 384-d Semantic + Hybrid Bridge */}
            <div
              style={{
                padding: "18px 20px",
                borderRadius: 18,
                background: isBridgeActive
                  ? `linear-gradient(135deg, ${THEME.civic700}, ${THEME.civic600})`
                  : THEME.civic50,
                border: `2px solid ${THEME.civic600}`,
                color: isBridgeActive ? "#ffffff" : THEME.ink900,
                transform: `scale(${isBridgeActive ? interpolate(bridgeSpring, [0, 1], [0.98, 1.02]) : 1})`,
                transition: "all 0.3s ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    color: isBridgeActive ? "#a7f3d0" : THEME.civic700,
                  }}
                >
                  <Sparkles size={16} /> OrdiSearch 384-d Vector + Hybrid Bridge
                </span>
                <span
                  style={{
                    fontFamily: THEME.fontMono,
                    fontSize: 11.5,
                    fontWeight: 800,
                    color: isBridgeActive ? "#ffffff" : THEME.civic700,
                  }}
                >
                  BAAI/bge-small-en-v1.5 ✓
                </span>
              </div>

              <svg width="100%" height="82" viewBox="0 0 520 82">
                <path
                  d="M 30 66 Q 260 10 490 66"
                  fill="none"
                  stroke={isBridgeActive ? "#6ee7b7" : THEME.civic600}
                  strokeWidth="3.5"
                  strokeDasharray="8 6"
                />
                <circle cx="30" cy="66" r="7" fill={THEME.gold500} />
                <circle cx="490" cy="66" r="7" fill={THEME.emerald500} />
                {/* Animated traveling signal dot along the semantic bridge */}
                <circle
                  cx={30 + pulseDot}
                  cy={66 - Math.sin((pulseDot / 460) * Math.PI) * 28}
                  r="6"
                  fill={isBridgeActive ? "#ffffff" : THEME.civic600}
                />
                <text
                  x="130"
                  y="22"
                  fill={isBridgeActive ? "#ecfdf5" : THEME.civic800}
                  fontSize="12"
                  fontWeight="700"
                >
                  Semantic Intent + Title/Section Fusion
                </text>
              </svg>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, opacity: 0.92 }}>
                <span>Everyday Borrowing Question</span>
                <span>Ord. No. 046 · Section 2 (Page 3)</span>
              </div>
            </div>
          </div>

          {/* RIGHT: Actual Enacted Statutory Provision from Ordinance No. 046, S. 2025 */}
          <div
            style={{
              height: 448,
              backgroundColor: THEME.paper,
              borderRadius: 20,
              border: `2px solid ${THEME.civic600}`,
              padding: "22px 24px",
              boxShadow: "0 18px 40px -18px rgba(20, 104, 58, 0.22)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: THEME.civic700 }}>
                  Enacted Polangui Provision
                </span>
                <span
                  style={{
                    padding: "3px 8px",
                    borderRadius: 6,
                    backgroundColor: THEME.civic50,
                    color: THEME.civic700,
                    fontSize: 11,
                    fontWeight: 800,
                  }}
                >
                  Ordinance No. 046, S. 2025 · Page 3
                </span>
              </div>

              <div style={{ fontFamily: THEME.fontSerif, fontSize: 20, fontWeight: 700, color: THEME.ink950, marginBottom: 10 }}>
                Section 2 · Authority to Sign Omnibus Term Agreement
              </div>

              <p
                style={{
                  fontSize: 13.5,
                  color: THEME.ink800,
                  lineHeight: 1.58,
                  backgroundColor: THEME.secondaryBg,
                  padding: "14px",
                  borderRadius: 12,
                  border: `1px solid ${THEME.border}`,
                  fontFamily: THEME.fontSerif,
                  margin: "0 0 12px 0",
                }}
              >
                &ldquo;<strong>Section 2. Authority.</strong> The{" "}
                <span style={{ backgroundColor: "#fef08a", padding: "1px 4px", borderRadius: 4, fontWeight: 700 }}>
                  Municipal Mayor
                </span>{" "}
                is hereby granted the authority to enter into and to sign the{" "}
                <span style={{ backgroundColor: THEME.civic100, padding: "1px 4px", borderRadius: 4, fontWeight: 700 }}>
                  Omnibus Term Agreement with the Land Bank of the Philippines
                </span>{" "}
                for and on behalf of the Local Government Unit of Polangui.&rdquo;
              </p>

              <div
                style={{
                  fontSize: 12,
                  color: THEME.ink600,
                  backgroundColor: THEME.bg,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: `1px solid ${THEME.border}`,
                }}
              >
                <strong>Document Title Context:</strong> Authorizing Hon. Raymond Adrian E. Salceda, Municipal Mayor of Polangui, to borrow{" "}
                <strong>Php 50,000,000.00</strong> with Land Bank.
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 14px",
                borderRadius: 10,
                backgroundColor: THEME.emerald50,
                border: `1px solid ${THEME.emerald500}`,
                color: THEME.emerald700,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              <CheckCircle2 size={16} />
              <span>Retrieved &amp; Cited with Exact Section &amp; Page Grounding</span>
            </div>
          </div>
        </div>
      </div>

      <TeleprompterBar ticks={TELEPROMPTER_TICKS.PROBLEM} />
    </AbsoluteFill>
  );
};
