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
  BookOpenCheck,
  Search,
  SlidersHorizontal,
  SendHorizonal,
  FileCheck2,
  Scale,
  Database,
  ShieldAlert,
  HeartPulse,
  Droplets,
  Building2,
  Wand2,
  Clock,
  Eye,
  BookOpen,
  FileText,
  LayoutDashboard,
  FileStack,
  ClipboardCheck,
  BarChart3,
  Gauge,
  Settings,
  Activity,
  CheckCircle2,
  ScanText,
  Users,
  RefreshCw,
  Upload,
  ArrowRight,
  Play,
  Sparkles,
  Landmark,
  CalendarDays,
  Layers,
  ChevronDown,
  ArrowUpRight,
  X,
} from "lucide-react";
import { THEME, TELEPROMPTER_TICKS } from "../constants";
import { TopHeaderBar, TeleprompterBar } from "../components/SharedUI";

export const SceneWalkthrough: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sec = frame / fps;

  const ticks = TELEPROMPTER_TICKS.WALKTHROUGH;
  const t1 = ticks[1]?.startSec ?? 8.5;
  const t2 = ticks[2]?.startSec ?? 17.5;
  const t3 = ticks[3]?.startSec ?? 28.0;
  const t4 = ticks[4]?.startSec ?? 38.3;
  const t5 = ticks[5]?.startSec ?? 48.2;
  const t6 = ticks[6]?.startSec ?? 58.5;
  const t7 = ticks[7]?.startSec ?? 72.3;
  const t8 = ticks[8]?.startSec ?? 80.7;
  const t9 = ticks[9]?.startSec ?? 92.8;

  // 7 Ticks dynamically locked to audio timestamps:
  // Tick 0 (0 - t1): Public Search Landing (`ChatLanding`)
  // Tick 1 (t1 - t2): Typing & submitting real Polangui query ("Who is authorized to borrow funds for the sanitary landfill?")
  // Tick 2 (t2 - t3): Grounded Legal Synthesis citing Ordinance No. 046, S. 2025
  // Tick 3 (t3 - t4): Slide-Over Parsed Section Inspector showing Section 2, Page 3
  // Tick 4 (t4 - t5): Document Repository showing the 3 real Polangui ordinances (046, 11-062, 11-063)
  // Tick 5 (t5 - t6): Admin Portal Workspace Overview
  // Tick 6 (t6 - end): Admin Retrieval Evaluation Experiment Runner

  const isPublicSearch = sec < t4;
  const isDocBrowser = sec >= t4 && sec < t5;
  const isAdminOverview = sec >= t5 && sec < t6;
  const isAdminEval = sec >= t6;

  const fullQuery = "Who is authorized to borrow funds for the sanitary landfill?";
  const typeDuration = Math.max(2.5, (t2 - t1) * 0.68);
  const typedChars =
    sec < t1
      ? 0
      : Math.min(fullQuery.length, Math.floor(((sec - t1) / typeDuration) * fullQuery.length));
  const displayedQuery = fullQuery.slice(0, typedChars);

  const showResults = sec >= t2 && sec < t4;
  const showCitationDrawer = sec >= t3 && sec < t4;

  const resultSpring = spring({
    frame: Math.max(0, frame - Math.round(fps * t2)),
    fps,
    config: { damping: 14, stiffness: 105 },
  });

  const drawerSpring = spring({
    frame: Math.max(0, frame - Math.round(fps * t3)),
    fps,
    config: { damping: 14, stiffness: 110 },
  });

  const docBrowserSpring = spring({
    frame: Math.max(0, frame - Math.round(fps * t4)),
    fps,
    config: { damping: 14, stiffness: 105 },
  });

  const adminSpring = spring({
    frame: Math.max(0, frame - Math.round(fps * t5)),
    fps,
    config: { damping: 14, stiffness: 105 },
  });

  const evalSpring = spring({
    frame: Math.max(0, frame - Math.round(fps * t6)),
    fps,
    config: { damping: 14, stiffness: 105 },
  });

  // Animated cursor coordinates synchronized to dynamic tick boundaries with pixel-perfect targets
  let cursorX = 960;
  let cursorY = 500;
  let isClicking = false;

  if (sec < t1) {
    // 0s -> t1: Glide from landing view into the center of Search Bar input field (720, 370)
    const p1 = Math.max(0.01, t1 * 0.45);
    const p2 = Math.max(0.02, t1);
    cursorX = interpolate(sec, [0, p1, p2], [1180, 880, 720], { extrapolateRight: "clamp" });
    cursorY = interpolate(sec, [0, p1, p2], [580, 460, 370], { extrapolateRight: "clamp" });
  } else if (sec < t2) {
    // t1 -> t2: Hover in input while typing query, then glide directly to "Search Ordinances" button center (1275, 435) and click
    const p1 = t1;
    const p2 = t1 + (t2 - t1) * 0.65;
    const p3 = t1 + (t2 - t1) * 0.90;
    const p4 = t2;
    cursorX = interpolate(sec, [p1, p2, p3, p4], [720, 780, 1275, 1275], { extrapolateRight: "clamp" });
    cursorY = interpolate(sec, [p1, p2, p3, p4], [370, 370, 435, 435], { extrapolateRight: "clamp" });
    isClicking = sec >= p3 && sec <= p4;
  } else if (sec < t3) {
    // t2 -> t3: Results appear. Move from search button to Citation [1] button center (690, 371) and click
    const p1 = t2;
    const p2 = t2 + (t3 - t2) * 0.45;
    const p3 = t2 + (t3 - t2) * 0.92;
    cursorX = interpolate(sec, [p1, p2, p3], [1275, 960, 690], { extrapolateRight: "clamp" });
    cursorY = interpolate(sec, [p1, p2, p3], [435, 390, 371], { extrapolateRight: "clamp" });
    isClicking = sec >= p3 && sec <= t3;
  } else if (sec < t4) {
    // t3 -> t4: Inspector drawer is open. Inspect statutory section (1550, 460), then move up to "Document repository" tab link (1470, 32) and click
    const p1 = t3;
    const p2 = t3 + (t4 - t3) * 0.55;
    const p3 = t3 + (t4 - t3) * 0.92;
    const p4 = t4;
    cursorX = interpolate(sec, [p1, p2, p3, p4], [690, 1550, 1470, 1470], { extrapolateRight: "clamp" });
    cursorY = interpolate(sec, [p1, p2, p3, p4], [371, 460, 32, 32], { extrapolateRight: "clamp" });
    isClicking = sec >= p3 && sec <= p4;
  } else if (sec < t5) {
    // t4 -> t5: In Document Repository. Inspect Ordinance No. 046 card (620, 480), then move to "Admin Portal" button (1813, 32) and click
    const p1 = t4;
    const p2 = t4 + (t5 - t4) * 0.45;
    const p3 = t4 + (t5 - t4) * 0.90;
    const p4 = t5;
    cursorX = interpolate(sec, [p1, p2, p3, p4], [1470, 620, 1813, 1813], { extrapolateRight: "clamp" });
    cursorY = interpolate(sec, [p1, p2, p3, p4], [32, 480, 32, 32], { extrapolateRight: "clamp" });
    isClicking = sec >= p3 && sec <= p4;
  } else if (sec < t6) {
    // t5 -> t6: In Admin Overview. Review counters, then move to "Evaluation" link in sidebar (125, 210) and click
    const p1 = t5;
    const p2 = t5 + (t6 - t5) * 0.50;
    const p3 = t5 + (t6 - t5) * 0.92;
    cursorX = interpolate(sec, [p1, p2, p3], [1813, 680, 125], { extrapolateRight: "clamp" });
    cursorY = interpolate(sec, [p1, p2, p3], [32, 280, 210], { extrapolateRight: "clamp" });
    isClicking = sec >= p3 && sec <= t6;
  } else {
    // t6 -> end: In Evaluation view. Move to "Run experiment" button center (1780, 280) and click
    const p1 = t6;
    const p2 = t6 + 2.5;
    const p3 = t6 + 4.2;
    const p4 = t6 + 5.0;
    cursorX = interpolate(sec, [p1, p2, p3, p4], [125, 960, 1780, 1780], { extrapolateRight: "clamp" });
    cursorY = interpolate(sec, [p1, p2, p3, p4], [210, 260, 280, 280], { extrapolateRight: "clamp" });
    isClicking = sec >= p3 && sec <= p4;
  }

  const sampleInquiries = [
    {
      category: "Municipal Finance · Ord. No. 046, S. 2025",
      query: "Who is authorized to borrow funds for the sanitary landfill?",
      icon: Building2,
      featured: true,
    },
    {
      category: "Maternal & Child Health · Ord. No. 11-062, S. 2025",
      query: "What nutrition programs support the first 1,000 days of life in Polangui?",
      icon: HeartPulse,
    },
    {
      category: "Barangay Waterworks · Ord. No. 11-063, S. 2025",
      query: "What is the purpose of the Railroad and Rinconada Waterworks Association (RRBWASA)?",
      icon: Droplets,
    },
    {
      category: "Statutory Limitations · Ord. No. 046, S. 2025",
      query: "What limits apply to the Mayor's authority under the Land Bank Omnibus Term Agreement?",
      icon: ShieldAlert,
    },
  ];

  // Subtle, balanced cinematic camera push-in across Walkthrough (Max 1.05x, centered)
  const cameraZoom = interpolate(
    sec,
    [0, 8, 9.5, 17, 18.5, 28, 29.5, 48, 50, 58, 60, 72, 74, 92, 94, 105],
    [1.0, 1.0, 1.04, 1.04, 1.05, 1.05, 1.04, 1.04, 1.03, 1.03, 1.04, 1.04, 1.02, 1.04, 1.02, 1.04],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const cameraOriginX = 50;
  const cameraOriginY = 50;

  const cameraTiltX = interpolate(
    sec,
    [0, 10, 20, 31, 45, 52, 62, 75, 92, 105],
    [0, 0.2, -0.2, 0.15, 0.15, -0.2, 0.15, 0.1, -0.1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const cameraTiltY = interpolate(
    sec,
    [0, 10, 20, 31, 45, 52, 62, 75, 92, 105],
    [0, -0.2, 0.2, -0.15, 0.2, -0.2, 0.15, -0.1, 0.1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: THEME.bg,
        fontFamily: THEME.fontSans,
        color: THEME.ink900,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          transform: `perspective(1400px) rotateX(${cameraTiltX}deg) rotateY(${cameraTiltY}deg) scale(${cameraZoom})`,
          transformOrigin: `${cameraOriginX}% ${cameraOriginY}%`,
          transformOrigin: "center center",
          transformStyle: "preserve-3d",
        }}
      >
        {/* ==================== PUBLIC INTERFACE (Ticks 0 - 4) ==================== */}
        {(isPublicSearch || isDocBrowser) && (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              backgroundColor: THEME.bg,
            }}
          >
            <TopHeaderBar activeTab={isDocBrowser ? "Document repository" : "Search"} />

            {/* 1. `ChatLanding` (Ticks 0 - 1) */}
            {isPublicSearch && !showResults && (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  paddingTop: 26,
                  paddingLeft: 60,
                  paddingRight: 60,
                }}
              >
                <div
                  style={{
                    width: 78,
                    height: 78,
                    borderRadius: "50%",
                    border: "2px solid rgba(217, 119, 6, 0.4)",
                    backgroundColor: THEME.paper,
                    padding: 4,
                    boxShadow: "0 10px 25px -10px rgba(15, 23, 42, 0.18)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 10,
                  }}
                >
                  <Img
                    src={staticFile("logo.png")}
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  />
                </div>

                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    borderRadius: 999,
                    border: "1px solid rgba(20, 104, 58, 0.2)",
                    backgroundColor: THEME.civic50,
                    padding: "5px 14px",
                    fontSize: 11.5,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: THEME.civic800,
                  }}
                >
                  <BookOpenCheck size={14} color={THEME.civic700} />
                  Municipality of Polangui, Albay
                </div>

                <h1
                  style={{
                    fontFamily: THEME.fontSerif,
                    fontSize: 50,
                    fontWeight: 700,
                    color: THEME.ink950,
                    margin: "8px 0 4px 0",
                    letterSpacing: "-0.02em",
                  }}
                >
                  OrdiSearch<span style={{ color: THEME.civic600 }}>.</span>
                </h1>
                <p style={{ fontSize: 15.5, fontWeight: 500, color: THEME.ink600, margin: "0 0 18px 0" }}>
                  Search through Polangui&apos;s enacted ordinances and legislative sections.
                </p>

                {/* Prominent Focal Search Bar */}
                <div
                  style={{
                    width: "100%",
                    maxWidth: 840,
                    backgroundColor: THEME.paper,
                    border: sec >= t1 ? `2px solid ${THEME.civic600}` : `2px solid ${THEME.border}`,
                    borderRadius: 24,
                    padding: "16px 20px",
                    boxShadow:
                      "0 12px 40px -12px rgba(20, 104, 58, 0.14), 0 4px 16px -4px rgba(0, 0, 0, 0.06)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 12,
                        backgroundColor: THEME.civic50,
                        color: THEME.civic700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Search size={18} strokeWidth={2.2} />
                    </div>
                    <div
                      style={{
                        flex: 1,
                        minHeight: 40,
                        paddingTop: 5,
                        fontSize: 17,
                        fontWeight: displayedQuery ? 600 : 500,
                        color: displayedQuery ? THEME.ink900 : THEME.ink400,
                      }}
                    >
                      {displayedQuery ||
                        "Ask about Polangui ordinances on municipal finance, child nutrition, or barangay waterworks..."}
                      {sec >= t1 && sec < t2 && (
                        <span
                          style={{
                            display: "inline-block",
                            width: 2,
                            height: 19,
                            backgroundColor: THEME.civic600,
                            marginLeft: 3,
                            verticalAlign: "middle",
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
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "4px 10px",
                          borderRadius: 8,
                          border: `1px solid ${THEME.border}`,
                          backgroundColor: THEME.bg,
                          fontSize: 11.5,
                          fontWeight: 600,
                          color: THEME.ink800,
                        }}
                      >
                        <SlidersHorizontal size={12} color={THEME.civic700} />
                        Hybrid + Rerank
                      </span>
                      <span style={{ fontSize: 11.5, color: THEME.ink400, fontWeight: 500 }}>
                        · Press{" "}
                        <span
                          style={{
                            padding: "1px 6px",
                            borderRadius: 4,
                            border: `1px solid ${THEME.border}`,
                            backgroundColor: THEME.bg,
                            fontSize: 10.5,
                            fontWeight: 600,
                            color: THEME.ink600,
                          }}
                        >
                          Enter
                        </span>{" "}
                        to search
                      </span>
                    </div>

                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 18px",
                        borderRadius: 12,
                        backgroundColor: isClicking ? THEME.civic800 : THEME.civic600,
                        color: "#ffffff",
                        fontSize: 13,
                        fontWeight: 600,
                        transform: isClicking ? "scale(0.95)" : "scale(1)",
                      }}
                    >
                      <span>Search Ordinances</span>
                      <SendHorizonal size={14} />
                    </div>
                  </div>
                </div>

                {/* Live Authentic Polangui Corpus Metrics Pill */}
                <div
                  style={{
                    marginTop: 14,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 14,
                    borderRadius: 999,
                    border: `1px solid ${THEME.border}`,
                    backgroundColor: "rgba(255,255,255,0.85)",
                    padding: "6px 16px",
                    fontSize: 12,
                    color: THEME.ink600,
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <FileCheck2 size={14} color={THEME.civic700} />
                    <strong style={{ color: THEME.ink900 }}>3</strong> Active Ordinances
                  </span>
                  <span style={{ color: THEME.ink300 }}>·</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <Scale size={14} color={THEME.civic700} />
                    <strong style={{ color: THEME.ink900 }}>93</strong> Legal Sections
                  </span>
                  <span style={{ color: THEME.ink300 }}>·</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <Database size={14} color={THEME.civic700} />
                    <strong style={{ color: THEME.ink900 }}>193</strong> Vector Chunks
                  </span>
                </div>

                {/* Explore Common Citizen Inquiries 2x2 Grid */}
                <div style={{ width: "100%", maxWidth: 840, marginTop: 20 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 10,
                      padding: "0 4px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: THEME.ink400,
                      }}
                    >
                      Explore Polangui legislative inquiries
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 500, color: THEME.ink400 }}>
                      Click to ask immediately
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {sampleInquiries.map((item) => {
                      const IconComp = item.icon;
                      return (
                        <div
                          key={item.query}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 12,
                            borderRadius: 16,
                            border: item.featured
                              ? `1.5px solid ${THEME.civic600}`
                              : `1px solid ${THEME.border}`,
                            backgroundColor: THEME.paper,
                            padding: "12px 14px",
                            boxShadow: item.featured
                              ? "0 8px 20px -10px rgba(20, 104, 58, 0.2)"
                              : "none",
                          }}
                        >
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 10,
                              backgroundColor: item.featured ? THEME.civic600 : THEME.civic50,
                              color: item.featured ? "#ffffff" : THEME.civic700,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <IconComp size={16} />
                          </div>
                          <div>
                            <div
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                textTransform: "uppercase",
                                letterSpacing: "0.08em",
                                color: THEME.civic700,
                              }}
                            >
                              {item.category}
                            </div>
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: 500,
                                color: THEME.ink800,
                                marginTop: 2,
                                lineHeight: 1.35,
                              }}
                            >
                              {item.query}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 2. `ChatMessageList` + Slide-Over Inspector Sheet (Ticks 2 - 3) */}
            {isPublicSearch && showResults && (
              <div
                style={{
                  flex: 1,
                  position: "relative",
                  padding: "20px 60px 105px 60px",
                  display: "flex",
                  justifyContent: "center",
                  opacity: resultSpring,
                }}
              >
                <div style={{ width: "100%", maxWidth: 940, display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* User Bubble */}
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <div
                      style={{
                        backgroundColor: THEME.civic700,
                        color: "#ffffff",
                        padding: "12px 18px",
                        borderRadius: "16px 16px 4px 16px",
                        fontSize: 15,
                        fontWeight: 500,
                        boxShadow: "0 4px 12px rgba(15, 81, 44, 0.2)",
                      }}
                    >
                      {fullQuery}
                    </div>
                  </div>

                  {/* Assistant Grounded Answer Card */}
                  <div
                    style={{
                      backgroundColor: THEME.paper,
                      border: `1px solid ${THEME.border}`,
                      borderRadius: 16,
                      padding: "20px 24px",
                      boxShadow: "0 10px 30px -18px rgba(15, 23, 42, 0.14)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingBottom: 12,
                        marginBottom: 14,
                        borderBottom: `1px solid ${THEME.secondaryBg}`,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "4px 10px",
                            borderRadius: 999,
                            backgroundColor: THEME.civic50,
                            color: THEME.civic800,
                            fontSize: 11.5,
                            fontWeight: 700,
                          }}
                        >
                          <Scale size={12} />
                          Source-Grounded Synthesis
                        </span>
                        <span
                          style={{
                            padding: "4px 10px",
                            borderRadius: 999,
                            backgroundColor: THEME.secondaryBg,
                            color: THEME.ink700,
                            fontSize: 11.5,
                            fontWeight: 600,
                          }}
                        >
                          Hybrid + Rerank
                        </span>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "4px 10px",
                            borderRadius: 999,
                            backgroundColor: THEME.emerald50,
                            color: THEME.emerald700,
                            fontSize: 11.5,
                            fontWeight: 700,
                          }}
                        >
                          <Wand2 size={12} />
                          Bilingual OCR &amp; Context Refined
                        </span>
                      </div>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          fontSize: 11.5,
                          color: THEME.ink400,
                          fontWeight: 600,
                        }}
                      >
                        <Clock size={12} />
                        Sub-Second CPU
                      </span>
                    </div>

                    {/* Grounded Answer Text citing Ordinance No. 046, S. 2025 */}
                    <p style={{ fontSize: 15, lineHeight: 1.65, color: THEME.ink900, margin: "0 0 14px 0" }}>
                      Under{" "}
                      <strong>Municipal Ordinance No. 046, Series of 2025</strong>, the Sangguniang Bayan authorizes{" "}
                      <strong>Honorable Raymond Adrian E. Salceda, Municipal Mayor of Polangui</strong>, to enter into and sign all documents pertaining to the borrowing of the Municipality of Polangui in the amount of{" "}
                      <strong>Fifty Million Pesos (Php 50,000,000.00)</strong> for the sanitary landfill{" "}
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "1px 7px",
                          borderRadius: 6,
                          border: "1px solid rgba(20, 104, 58, 0.3)",
                          backgroundColor: showCitationDrawer ? THEME.civic700 : THEME.civic50,
                          color: showCitationDrawer ? "#ffffff" : THEME.civic800,
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        [1]
                      </span>
                      . Specifically, <strong>Section 2 (Authority)</strong> grants the Municipal Mayor the authority to enter into and sign the{" "}
                      <strong>Omnibus Term Agreement with the Land Bank of the Philippines</strong> on behalf of the Local Government Unit of Polangui{" "}
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "1px 7px",
                          borderRadius: 6,
                          border: "1px solid rgba(20, 104, 58, 0.3)",
                          backgroundColor: THEME.civic50,
                          color: THEME.civic800,
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        [2]
                      </span>
                      , within the limits prescribed in <strong>Section 3 (Limitation)</strong>.
                    </p>

                    {/* Verified Legal Citations Callout */}
                    <div
                      style={{
                        borderRadius: 12,
                        border: "1px solid rgba(30, 130, 76, 0.22)",
                        backgroundColor: "rgba(234, 245, 238, 0.55)",
                        padding: "12px 14px",
                        marginBottom: 16,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          color: THEME.civic800,
                          marginBottom: 8,
                        }}
                      >
                        Verified Legal Citations — Click to Instantly Inspect Parsed Section
                      </div>
                      <div style={{ display: "flex", gap: 10 }}>
                        {[
                          "Ordinance No. 046, S. 2025 · Section 2 (Authority · Page 3)",
                          "Ordinance No. 046, S. 2025 · Section 1 (Title · Page 2)",
                        ].map((cit, i) => (
                          <div
                            key={cit}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 8,
                              borderRadius: 8,
                              border: "1px solid rgba(20, 104, 58, 0.25)",
                              backgroundColor: i === 0 && isClicking ? THEME.civic700 : THEME.paper,
                              color: i === 0 && isClicking ? "#ffffff" : THEME.civic900,
                              padding: "6px 12px",
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            <span
                              style={{
                                width: 16,
                                height: 16,
                                borderRadius: "50%",
                                backgroundColor: THEME.civic700,
                                color: "#ffffff",
                                fontSize: 10,
                                fontWeight: 700,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {i + 1}
                            </span>
                            <span>{cit}</span>
                            <Eye size={13} color={THEME.civic700} />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Retrieved Ordinance Provisions Section */}
                    <div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 8,
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: 12,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            color: THEME.ink600,
                          }}
                        >
                          <BookOpen size={14} color={THEME.civic700} />
                          Retrieved Ordinance Provisions (3)
                        </span>
                        <span style={{ fontSize: 11, color: THEME.ink400 }}>
                          Click any provision to inspect full parsed section
                        </span>
                      </div>

                      <div
                        style={{
                          borderRadius: 12,
                          border: `1px solid ${THEME.border}`,
                          backgroundColor: "rgba(248, 250, 252, 0.6)",
                          padding: "14px 16px",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span
                              style={{
                                borderRadius: 4,
                                backgroundColor: THEME.civic700,
                                color: "#ffffff",
                                padding: "2px 6px",
                                fontSize: 10.5,
                                fontWeight: 700,
                              }}
                            >
                              #1
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink900 }}>
                              Ordinance No. 046, S. 2025 · Section 2 — Authority (Land Bank Omnibus Term Agreement)
                            </span>
                            <span
                              style={{
                                padding: "2px 8px",
                                borderRadius: 999,
                                backgroundColor: THEME.civic50,
                                color: THEME.civic700,
                                fontSize: 11,
                                fontWeight: 700,
                              }}
                            >
                              Page 3
                            </span>
                          </div>

                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 5,
                                padding: "5px 10px",
                                borderRadius: 8,
                                backgroundColor: THEME.civic600,
                                color: "#ffffff",
                                fontSize: 11.5,
                                fontWeight: 600,
                              }}
                            >
                              <Eye size={12} /> Inspect Parsed Section
                            </span>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                padding: "5px 10px",
                                borderRadius: 8,
                                border: `1px solid ${THEME.border}`,
                                backgroundColor: THEME.paper,
                                fontSize: 11.5,
                                fontWeight: 600,
                                color: THEME.ink700,
                              }}
                            >
                              <ChevronDown size={12} /> Expand Full Text Inline
                            </span>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                fontSize: 11.5,
                                fontWeight: 600,
                                color: THEME.civic700,
                              }}
                            >
                              <FileText size={12} /> Open Full Ordinance <ArrowUpRight size={11} />
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right-Side Slide-Over `Parsed Section Inspector` Sheet (Tick 3) */}
                {showCitationDrawer && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      backgroundColor: "rgba(2, 6, 23, 0.45)",
                      display: "flex",
                      justifyContent: "flex-end",
                      zIndex: 50,
                    }}
                  >
                    <div
                      style={{
                        width: 740,
                        height: "100%",
                        backgroundColor: THEME.paper,
                        borderLeft: `1px solid ${THEME.border}`,
                        boxShadow: "-20px 0 50px rgba(2, 6, 23, 0.25)",
                        transform: `translateX(${interpolate(drawerSpring, [0, 1], [300, 0])}px)`,
                        display: "flex",
                        flexDirection: "column",
                        paddingBottom: 95,
                      }}
                    >
                      <div
                        style={{
                          padding: "16px 24px",
                          backgroundColor: THEME.bg,
                          borderBottom: `1px solid ${THEME.border}`,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span
                              style={{
                                padding: "3px 10px",
                                borderRadius: 999,
                                backgroundColor: THEME.civic50,
                                color: THEME.civic800,
                                fontSize: 11.5,
                                fontWeight: 700,
                              }}
                            >
                              Citation [1]
                            </span>
                            <span
                              style={{
                                padding: "3px 10px",
                                borderRadius: 999,
                                backgroundColor: THEME.secondaryBg,
                                color: THEME.ink700,
                                fontSize: 11.5,
                                fontWeight: 600,
                              }}
                            >
                              Municipal Ordinance No. 046
                            </span>
                            <span
                              style={{
                                padding: "3px 10px",
                                borderRadius: 999,
                                border: `1px solid ${THEME.border}`,
                                color: THEME.ink600,
                                fontSize: 11.5,
                                fontWeight: 600,
                              }}
                            >
                              Series of 2025
                            </span>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                padding: "3px 10px",
                                borderRadius: 999,
                                backgroundColor: THEME.emerald50,
                                color: THEME.emerald700,
                                fontSize: 11.5,
                                fontWeight: 700,
                              }}
                            >
                              <Wand2 size={11} /> Bilingual OCR Cleaned
                            </span>
                          </div>
                          <h2
                            style={{
                              fontFamily: THEME.fontSerif,
                              fontSize: 18.5,
                              fontWeight: 600,
                              color: THEME.ink900,
                              margin: "8px 0 0 0",
                              lineHeight: 1.32,
                            }}
                          >
                            An Ordinance Authorizing Hon. Raymond Adrian E. Salceda, Municipal Mayor of Polangui, to Enter Into and Sign All Documents Pertaining to the Php 50,000,000.00 Land Bank Borrowing
                          </h2>
                        </div>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            border: `1px solid ${THEME.border}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <X size={15} color={THEME.ink600} />
                        </div>
                      </div>

                      <div
                        style={{
                          padding: "12px 24px",
                          borderBottom: `1px solid ${THEME.border}`,
                          backgroundColor: THEME.paper,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: THEME.ink600 }}>
                          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                              <Landmark size={13} color={THEME.civic700} /> Municipality of Polangui
                            </span>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                              <CalendarDays size={13} color={THEME.civic700} /> Enacted Feb 2025
                            </span>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontWeight: 700, color: THEME.ink800 }}>
                              <FileText size={13} color={THEME.civic700} /> Section 2 · Page 3 of 16
                            </span>
                          </div>
                          <div style={{ display: "flex", gap: 6 }}>
                            <span style={{ padding: "2px 8px", borderRadius: 999, backgroundColor: THEME.civic50, color: THEME.civic800, fontSize: 11, fontWeight: 700 }}>
                              Hybrid + Rerank
                            </span>
                            <span style={{ padding: "2px 8px", borderRadius: 999, backgroundColor: THEME.secondaryBg, color: THEME.ink700, fontSize: 11, fontWeight: 600 }}>
                              384-d Vector
                            </span>
                            <span style={{ padding: "2px 8px", borderRadius: 999, backgroundColor: THEME.secondaryBg, color: THEME.ink700, fontSize: 11, fontWeight: 600 }}>
                              Lexical Boost
                            </span>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: 8, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${THEME.secondaryBg}` }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              padding: "6px 12px",
                              borderRadius: 8,
                              backgroundColor: THEME.civic600,
                              color: "#ffffff",
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            <Sparkles size={13} /> Cited Parsed Section
                          </span>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              padding: "6px 12px",
                              borderRadius: 8,
                              backgroundColor: THEME.secondaryBg,
                              color: THEME.ink700,
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            <Layers size={13} /> All Ordinance Sections (4)
                          </span>
                        </div>
                      </div>

                      <div style={{ padding: "18px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
                        <div
                          style={{
                            borderRadius: 12,
                            border: "1px solid rgba(20, 104, 58, 0.3)",
                            backgroundColor: "rgba(234, 245, 238, 0.5)",
                            padding: "12px 16px",
                          }}
                        >
                          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: THEME.civic800, marginBottom: 4 }}>
                            Extracted Grounded Claim
                          </div>
                          <div style={{ fontSize: 13.5, color: THEME.ink900, fontWeight: 500 }}>
                            Municipal Mayor Raymond Adrian E. Salceda is granted authority to enter into and sign the Omnibus Term Agreement with the Land Bank of the Philippines on behalf of LGU Polangui.
                          </div>
                        </div>

                        <div
                          style={{
                            borderRadius: 12,
                            border: `1px solid ${THEME.border}`,
                            backgroundColor: THEME.bg,
                            padding: "14px 16px",
                            fontFamily: THEME.fontSerif,
                            fontSize: 14.5,
                            lineHeight: 1.6,
                            color: THEME.ink900,
                          }}
                        >
                          <strong>Section 2. Authority.</strong> — The{" "}
                          <span style={{ backgroundColor: "#fef08a", padding: "1px 4px", borderRadius: 4, fontWeight: 700 }}>
                            Municipal Mayor
                          </span>{" "}
                          is hereby granted the{" "}
                          <span style={{ backgroundColor: "#fef08a", padding: "1px 4px", borderRadius: 4, fontWeight: 700 }}>
                            authority to enter into and to sign
                          </span>{" "}
                          the{" "}
                          <span style={{ backgroundColor: "#fef08a", padding: "1px 4px", borderRadius: 4, fontWeight: 700 }}>
                            Omnibus Term Agreement with the Land Bank of the Philippines
                          </span>{" "}
                          for and on behalf of the Local Government Unit of Polangui.
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. `DocumentBrowser` (Tick 4) */}
            {isDocBrowser && (
              <div
                style={{
                  flex: 1,
                  padding: "28px 80px 105px 80px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 18,
                  opacity: docBrowserSpring,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.14em",
                      color: THEME.civic700,
                    }}
                  >
                    OrdiSearch · Document Repository
                  </div>
                  <h1
                    style={{
                      fontFamily: THEME.fontSerif,
                      fontSize: 36,
                      fontWeight: 600,
                      color: THEME.ink900,
                      margin: "6px 0 6px 0",
                    }}
                  >
                    Browse the Polangui ordinance corpus
                  </h1>
                  <p style={{ fontSize: 14.5, color: THEME.ink700, margin: 0, maxWidth: 880 }}>
                    Only official ordinances of the Municipality of Polangui approved and activated for retrieval appear here. Raw PDF downloads and wet signatures are withheld from the public view for privacy protection.
                  </p>
                </div>

                {/* 4-Column Filter Bar */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: 12,
                    borderRadius: 12,
                    border: `1px solid ${THEME.borderStrong}`,
                    backgroundColor: THEME.paper,
                    padding: 16,
                  }}
                >
                  {[
                    { label: "Title or ordinance number", val: "2025", isSearch: true },
                    { label: "Year", val: "2025", isSearch: false },
                    { label: "Type", val: "Ordinance", isSearch: false },
                    { label: "Jurisdiction", val: "Municipality of Polangui", isSearch: false },
                  ].map((field) => (
                    <div key={field.label}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: THEME.ink700, marginBottom: 6 }}>
                        {field.label}
                      </div>
                      <div
                        style={{
                          height: 38,
                          borderRadius: 8,
                          border: field.isSearch ? `1.5px solid ${THEME.civic600}` : `1px solid ${THEME.borderStrong}`,
                          backgroundColor: THEME.paper,
                          padding: "0 12px",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontSize: 13.5,
                          color: THEME.ink900,
                          fontWeight: 500,
                        }}
                      >
                        {field.isSearch && <Search size={14} color={THEME.ink600} />}
                        <span>{field.val}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Authentic 3 Polangui Ordinance Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, flex: 1 }}>
                  {[
                    {
                      num: "Ordinance No. 046, S. 2025",
                      year: "2025",
                      title:
                        "Authorizing Hon. Raymond Adrian E. Salceda, Municipal Mayor of Polangui, to Enter Into and Sign All Documents Pertaining to thePhp 50,000,000.00 Borrowing with Land Bank (Sanitary Landfill)",
                      sections: "4 sections · 16 pages",
                      status: "active",
                    },
                    {
                      num: "Ordinance No. 11-062, S. 2025",
                      year: "2025",
                      title:
                        "An Ordinance Supporting the Maternal and Child Nutrition Law in the Municipality of Polangui and Appropriating Funds for the Purpose (First 1,000 Days of Life)",
                      sections: "43 sections · 35 pages",
                      status: "active",
                    },
                    {
                      num: "Ordinance No. 11-063, S. 2025",
                      year: "2025",
                      title:
                        "An Ordinance Amending Municipal Ordinance No. 02 S. 2018, and Creating Railroad and Rinconada Barangays Waterworks and Services Association (RRBWASA)",
                      sections: "46 sections · 30 pages",
                      status: "active",
                    },
                  ].map((doc, i) => (
                    <div
                      key={doc.num}
                      style={{
                        borderRadius: 14,
                        border: i === 0 ? `2px solid ${THEME.civic600}` : `1px solid ${THEME.border}`,
                        backgroundColor: THEME.paper,
                        padding: "18px 20px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                          <span
                            style={{
                              padding: "3px 10px",
                              borderRadius: 999,
                              backgroundColor: THEME.civic50,
                              color: THEME.civic700,
                              fontSize: 11.5,
                              fontWeight: 700,
                            }}
                          >
                            {doc.num}
                          </span>
                          <span
                            style={{
                              padding: "3px 8px",
                              borderRadius: 999,
                              backgroundColor: THEME.emerald50,
                              color: THEME.emerald700,
                              fontSize: 11,
                              fontWeight: 700,
                              textTransform: "uppercase",
                            }}
                          >
                            {doc.status}
                          </span>
                        </div>
                        <h3 style={{ fontFamily: THEME.fontSerif, fontSize: 17.5, fontWeight: 600, color: THEME.ink900, margin: "0 0 8px 0", lineHeight: 1.35 }}>
                          {doc.title}
                        </h3>
                      </div>

                      <div
                        style={{
                          paddingTop: 10,
                          borderTop: `1px solid ${THEME.border}`,
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 12,
                          color: THEME.ink600,
                          fontWeight: 600,
                        }}
                      >
                        <span>Series of {doc.year}</span>
                        <span style={{ color: THEME.civic700 }}>{doc.sections}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== ADMIN PORTAL (Ticks 5 - 6) ==================== */}
        {(isAdminOverview || isAdminEval) && (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "grid",
              gridTemplateColumns: "250px 1fr",
              backgroundColor: THEME.bg,
              opacity: adminSpring,
            }}
          >
            {/* `AdminShell` Sidebar */}
            <div
              style={{
                backgroundColor: THEME.ink950,
                color: "#ffffff",
                borderRight: "1px solid rgba(30, 41, 59, 0.6)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                paddingBottom: 95,
              }}
            >
              <div>
                <div
                  style={{
                    height: 64,
                    borderBottom: "1px solid rgba(30, 41, 59, 0.8)",
                    padding: "0 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      backgroundColor: THEME.paper,
                      padding: 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Img src={staticFile("logo.png")} style={{ width: 28, height: 28, objectFit: "contain" }} />
                  </div>
                  <div style={{ lineHeight: 1.15 }}>
                    <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#ffffff" }}>
                      OrdiSearch Admin
                    </span>
                    <span
                      style={{
                        display: "block",
                        fontSize: 10,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.14em",
                        color: THEME.civic400,
                      }}
                    >
                      Polangui, Albay
                    </span>
                  </div>
                </div>

                <div style={{ padding: "16px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
                  {[
                    { label: "Overview", icon: LayoutDashboard, active: isAdminOverview },
                    { label: "Documents", icon: FileStack, active: false },
                    { label: "Benchmark queries", icon: ClipboardCheck, active: false },
                    { label: "Evaluation", icon: BarChart3, active: isAdminEval },
                    { label: "Quality survey", icon: Gauge, active: false },
                    { label: "Settings", icon: Settings, active: false },
                    { label: "Audit log", icon: Activity, active: false },
                  ].map((item) => {
                    const IconComp = item.icon;
                    return (
                      <div
                        key={item.label}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          borderRadius: 8,
                          padding: "8px 12px",
                          fontSize: 14,
                          fontWeight: item.active ? 600 : 500,
                          backgroundColor: item.active ? THEME.civic600 : "transparent",
                          color: item.active ? "#ffffff" : THEME.ink300,
                        }}
                      >
                        <IconComp size={16} />
                        <span>{item.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Main Admin Content */}
            <div style={{ padding: "26px 44px 105px 44px", display: "flex", flexDirection: "column", gap: 20 }}>
              {isAdminOverview ? (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <h1 style={{ fontFamily: THEME.fontSerif, fontSize: 32, fontWeight: 600, color: THEME.ink900, margin: "0 0 4px 0" }}>
                        Workspace overview
                      </h1>
                      <p style={{ fontSize: 14, color: THEME.ink600, margin: 0 }}>
                        Monitor intake, review workload, and retrieval readiness. Activate only documents whose extracted text has been reviewed.
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "8px 14px",
                          borderRadius: 8,
                          border: `1px solid ${THEME.borderStrong}`,
                          backgroundColor: THEME.paper,
                          fontSize: 13,
                          fontWeight: 600,
                          color: THEME.ink800,
                        }}
                      >
                        <RefreshCw size={14} /> Refresh
                      </span>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "8px 14px",
                          borderRadius: 8,
                          backgroundColor: THEME.civic600,
                          color: "#ffffff",
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        <Upload size={14} /> Upload documents
                      </span>
                    </div>
                  </div>

                  {/* Authentic Polangui Database Stats */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
                    {[
                      {
                        label: "Active for retrieval",
                        value: "3",
                        detail: "81 total scanned pages",
                        icon: CheckCircle2,
                        bg: THEME.civic50,
                        color: THEME.civic700,
                      },
                      {
                        label: "Bilingual OCR Status",
                        value: "100%",
                        detail: "English + Filipino cleaned",
                        icon: ScanText,
                        bg: THEME.gold100,
                        color: THEME.gold700,
                      },
                      {
                        label: "Indexed sections",
                        value: "93",
                        detail: "193 384-d vector chunks",
                        icon: Database,
                        bg: THEME.blue50,
                        color: THEME.blue700,
                      },
                      {
                        label: "Signatory blocks isolated",
                        value: "3",
                        detail: "Protected from public view",
                        icon: Users,
                        bg: THEME.secondaryBg,
                        color: THEME.ink700,
                      },
                    ].map((c) => {
                      const IconComp = c.icon;
                      return (
                        <div
                          key={c.label}
                          style={{
                            backgroundColor: THEME.paper,
                            border: `1px solid ${THEME.border}`,
                            borderRadius: 14,
                            padding: "18px 20px",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: 10,
                                backgroundColor: c.bg,
                                color: c.color,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <IconComp size={20} />
                            </div>
                            <ArrowRight size={15} color={THEME.ink400} />
                          </div>
                          <div style={{ fontFamily: THEME.fontSerif, fontSize: 30, fontWeight: 600, color: THEME.ink900, marginTop: 12 }}>
                            {c.value}
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: THEME.ink800, marginTop: 2 }}>
                            {c.label}
                          </div>
                          <div style={{ fontSize: 12, color: THEME.ink600, marginTop: 2 }}>{c.detail}</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Two Columns: `Recent processing jobs` + `System readiness` */}
                  <div style={{ display: "grid", gridTemplateColumns: "1.45fr 1fr", gap: 20, flex: 1 }}>
                    <div
                      style={{
                        backgroundColor: THEME.paper,
                        border: `1px solid ${THEME.border}`,
                        borderRadius: 14,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          padding: "14px 20px",
                          borderBottom: `1px solid ${THEME.border}`,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <div style={{ fontFamily: THEME.fontSerif, fontSize: 18, fontWeight: 600, color: THEME.ink900 }}>
                            Recent processing jobs
                          </div>
                          <div style={{ fontSize: 12, color: THEME.ink600 }}>Intake and indexing activity</div>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: THEME.civic700, display: "inline-flex", alignItems: "center", gap: 4 }}>
                          View documents <ArrowRight size={13} />
                        </span>
                      </div>

                      <div style={{ padding: "8px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
                        {[
                          { type: "ingest", status: "completed", stage: "Indexed · Ordinance No. 046, S. 2025 (Php 50M Land Bank Borrowing)" },
                          { type: "ingest", status: "completed", stage: "Indexed · Ordinance No. 11-062, S. 2025 (Maternal & Child Nutrition)" },
                          { type: "ingest", status: "completed", stage: "Indexed · Ordinance No. 11-063, S. 2025 (RRBWASA Waterworks)" },
                        ].map((job, idx) => (
                          <div
                            key={idx}
                            style={{
                              padding: "10px 0",
                              borderBottom: idx < 2 ? `1px solid ${THEME.border}` : "none",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <div>
                              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                <span
                                  style={{
                                    padding: "2px 8px",
                                    borderRadius: 999,
                                    backgroundColor: THEME.secondaryBg,
                                    color: THEME.ink700,
                                    fontSize: 11,
                                    fontWeight: 700,
                                  }}
                                >
                                  {job.type}
                                </span>
                                <span
                                  style={{
                                    padding: "2px 8px",
                                    borderRadius: 999,
                                    backgroundColor: THEME.emerald50,
                                    color: THEME.emerald700,
                                    fontSize: 11,
                                    fontWeight: 700,
                                  }}
                                >
                                  {job.status}
                                </span>
                              </div>
                              <div style={{ fontSize: 12.5, color: THEME.ink600, marginTop: 4 }}>{job.stage}</div>
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 600, color: THEME.civic700 }}>Inspect</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div
                      style={{
                        backgroundColor: THEME.paper,
                        border: `1px solid ${THEME.border}`,
                        borderRadius: 14,
                        padding: "16px 20px",
                      }}
                    >
                      <div style={{ fontFamily: THEME.fontSerif, fontSize: 18, fontWeight: 600, color: THEME.ink900, marginBottom: 12 }}>
                        System readiness
                      </div>
                      {[
                        ["Embedding model", "BAAI/bge-small-en-v1.5 (384-d)"],
                        ["Tesseract OCR", "Available (eng + fil)"],
                        ["Convex + SQLite FTS5", "Synchronized"],
                        ["Benchmark queries", "Ready for evaluation"],
                      ].map(([k, v]) => (
                        <div
                          key={k}
                          style={{
                            padding: "9px 0",
                            borderBottom: `1px solid ${THEME.border}`,
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: 13,
                          }}
                        >
                          <span style={{ color: THEME.ink600 }}>{k}</span>
                          <span style={{ fontWeight: 600, color: THEME.ink900 }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                /* `Retrieval evaluation` (Tick 6) */
                <div style={{ opacity: evalSpring, display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <h1 style={{ fontFamily: THEME.fontSerif, fontSize: 32, fontWeight: 600, color: THEME.ink900, margin: "0 0 4px 0" }}>
                        Retrieval evaluation
                      </h1>
                      <p style={{ fontSize: 14, color: THEME.ink600, margin: 0 }}>
                        Run controlled experiments over the human-judged Polangui benchmark set. Metrics are computed from graded sections only.
                      </p>
                    </div>
                    <span
                      style={{
                        padding: "8px 14px",
                        borderRadius: 8,
                        border: `1px solid ${THEME.borderStrong}`,
                        backgroundColor: THEME.paper,
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      Refresh
                    </span>
                  </div>

                  <div
                    style={{
                      backgroundColor: THEME.paper,
                      border: `1px solid ${THEME.border}`,
                      borderRadius: 14,
                      padding: "16px 20px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: THEME.fontSerif, fontSize: 18, fontWeight: 600, color: THEME.ink900 }}>
                      <Play size={16} color={THEME.civic700} /> Run a new experiment
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 1fr", gap: 12, marginTop: 12 }}>
                      {[
                        { label: "Experiment name", val: "Polangui Enacted Corpus Ablation Run" },
                        { label: "Top K", val: "10" },
                        { label: "Notes", val: "4-Mode Chapter 3 evaluation protocol" },
                      ].map((f) => (
                        <div key={f.label}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: THEME.ink700, marginBottom: 4 }}>{f.label}</div>
                          <div
                            style={{
                              height: 36,
                              borderRadius: 8,
                              border: `1px solid ${THEME.borderStrong}`,
                              padding: "0 12px",
                              display: "flex",
                              alignItems: "center",
                              fontSize: 13,
                              color: THEME.ink900,
                            }}
                          >
                            {f.val}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                      <div style={{ display: "flex", gap: 16 }}>
                        {["keyword", "vector", "hybrid", "hybrid_rerank"].map((cfg) => (
                          <span key={cfg} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13.5, color: THEME.ink800, fontWeight: 500 }}>
                            <span
                              style={{
                                width: 16,
                                height: 16,
                                borderRadius: 4,
                                backgroundColor: THEME.civic600,
                                color: "#ffffff",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 11,
                                fontWeight: 800,
                              }}
                            >
                              ✓
                            </span>
                            {cfg}
                          </span>
                        ))}
                      </div>
                      <span
                        style={{
                          padding: "8px 16px",
                          borderRadius: 8,
                          backgroundColor: THEME.civic600,
                          color: "#ffffff",
                          fontSize: 13,
                          fontWeight: 600,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Play size={14} /> Run experiment
                      </span>
                    </div>
                  </div>

                  {/* Metric Architecture Matrix (No Fabricated Numbers) */}
                  <div
                    style={{
                      backgroundColor: THEME.paper,
                      border: `1px solid ${THEME.border}`,
                      borderRadius: 14,
                      padding: "14px 20px",
                    }}
                  >
                    <div style={{ fontFamily: THEME.fontSerif, fontSize: 17, fontWeight: 600, color: THEME.ink900, marginBottom: 10 }}>
                      Automated Metric Computation Matrix
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.5fr repeat(4, 1fr)",
                        padding: "8px 12px",
                        backgroundColor: THEME.secondaryBg,
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 700,
                        color: THEME.ink700,
                      }}
                    >
                      <span>Metric</span>
                      <span>keyword</span>
                      <span>vector</span>
                      <span>hybrid</span>
                      <span style={{ color: THEME.civic700 }}>hybrid_rerank</span>
                    </div>
                    {[
                      ["Precision@K", "Lexical Baseline", "Semantic Match", "Weighted Fusion", "Phrase + Stem Boost"],
                      ["Recall@K", "Exact Token Recall", "Conceptual Recall", "Combined Recall", "Full Section Recall"],
                      ["MRR & nDCG@K", "Rank Logged", "Rank Logged", "Rank Logged", "Graded Gain Logged"],
                      ["Citation correctness", "Section Verified", "Section Verified", "Section Verified", "Section + Page Grounded"],
                      ["Median & P95 latency", "ms Recorded", "ms Recorded", "ms Recorded", "ms Recorded"],
                    ].map((row) => (
                      <div
                        key={row[0]}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1.5fr repeat(4, 1fr)",
                          padding: "9px 12px",
                          borderBottom: `1px solid ${THEME.border}`,
                          fontSize: 13,
                          color: THEME.ink800,
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>{row[0]}</span>
                        <span>{row[1]}</span>
                        <span>{row[2]}</span>
                        <span>{row[3]}</span>
                        <span style={{ fontWeight: 700, color: THEME.civic700 }}>{row[4]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Animated Click Ripple Feedback */}
        {isClicking && (
          <div
            style={{
              position: "absolute",
              left: cursorX - 16,
              top: cursorY - 16,
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: `3px solid ${THEME.civic600}`,
              backgroundColor: "rgba(20, 104, 58, 0.28)",
              pointerEvents: "none",
              zIndex: 88,
              boxShadow: "0 0 16px rgba(20, 104, 58, 0.6)",
            }}
          />
        )}

        {/* Animated Mouse Cursor Overlay */}
        <div
          style={{
            position: "absolute",
            left: cursorX,
            top: cursorY,
            transform: `scale(${isClicking ? 0.84 : 1})`,
            pointerEvents: "none",
            zIndex: 90,
            filter: "drop-shadow(0 6px 12px rgba(15, 23, 42, 0.35))",
            transition: "transform 0.08s ease-out",
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 3L11.5 20L14.2 13.5L20.5 11L4 3Z"
              fill={THEME.ink950}
              stroke="#ffffff"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      <TeleprompterBar ticks={TELEPROMPTER_TICKS.WALKTHROUGH} />
    </AbsoluteFill>
  );
};
