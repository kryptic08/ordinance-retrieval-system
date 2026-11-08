import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import {
  Landmark,
  Scale,
  Users,
  Lock,
  FileSearch,
  Database,
  BarChart3,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Layers,
  Sparkles,
} from "lucide-react";
import { THEME, TELEPROMPTER_TICKS } from "../constants";
import { TopHeaderBar, TeleprompterBar } from "../components/SharedUI";

export const SceneSignificanceObjectives: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sec = frame / fps;

  const ticks = TELEPROMPTER_TICKS.SIGNIFICANCE_OBJECTIVES;
  const t1 = ticks[1]?.startSec ?? 9.82;
  const t2 = ticks[2]?.startSec ?? 20.39;
  const t3 = ticks[3]?.startSec ?? 30.1;
  const t4 = ticks[4]?.startSec ?? 42.0;
  const t5 = ticks[5]?.startSec ?? 51.0;
  const t6 = ticks[6]?.startSec ?? 62.0;

  // Phase 1 (Ticks 0 - 3): 5 Stakeholder Beneficiary Groups & RA 10173 Privacy Safeguards
  // Phase 2 (Ticks 4 - 6): 3 Specific Objectives Technical Roadmap
  const isObjectivesPhase = sec >= t4;

  // Subtle, balanced cinematic camera push-in across Significance & Objectives (Max 1.05x, centered)
  const cameraZoom = interpolate(
    sec,
    [0, 1.5, t1 - 1, t1 + 0.5, t2 - 1, t2 + 0.5, t3 - 0.8, t3, t4 - 1, t4 + 0.5, t5 - 1, t5 + 0.5, 74],
    [1.0, 1.04, 1.04, 1.04, 1.04, 1.04, 1.04, 1.04, 1.01, 1.05, 1.05, 1.05, 1.05],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const cameraOriginX = 50;
  const cameraOriginY = 50;

  const cameraTiltX = interpolate(
    sec,
    [0, t1, t2, t3, t4, t5, t6, 74],
    [0, 0.2, -0.2, 0.15, 0, 0.2, -0.2, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const cameraTiltY = interpolate(
    sec,
    [0, t1, t2, t3, t4, t5, t6, 74],
    [0, -0.2, 0.2, -0.15, 0, -0.2, 0.2, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const stakeholders = [
    {
      title: "Office of the SB Secretary (Records Custodian)",
      badge: "Sub-Second Section Lookup",
      metric:
        "Replaces manual examination of multi-page PDF binders with instant, page-grounded statutory retrieval across enacted municipal ordinances.",
      icon: Landmark,
      active: sec < t1,
      stats: "< 200ms Latency · Citation Grounded",
    },
    {
      title: "Sangguniang Bayan & Municipal Lawmakers",
      badge: "Statutory Cross-Referencing",
      metric:
        "Rapidly checks prior ordinances—such as Ordinance No. 02 S. 2018 vs. Ordinance No. 11-063 S. 2025—to prevent policy overlap before enactment.",
      icon: Scale,
      active: sec >= t1 && sec < t2,
      stats: "Prevents Duplication · Conflict Detection",
    },
    {
      title: "Citizens, Barangays & Policy Researchers",
      badge: "Plain-Language Access",
      metric:
        "Bridges complex legal language with everyday natural-language inquiries in English and Filipino, demystifying local statutory obligations.",
      icon: Users,
      active: sec >= t2 && sec < t3,
      stats: "Bilingual English & Filipino · Zero Jargon Barrier",
    },
    {
      title: "Official Privacy & Signature Protection (RA 10173)",
      badge: "Wet Signatures Withheld",
      metric:
        "Isolates physical wet-signature blocks and withholds raw PDF downloads from the public interface, complying with Republic Act 10173.",
      icon: Lock,
      active: sec >= t3 && sec < t4,
      stats: "Attestation Cataloging · Privacy Redaction Vault",
    },
  ];

  const objectives = [
    {
      num: "01",
      title: "Corpus & Legal Schema",
      sub: "LGU Polangui Legislative Dataset",
      icon: FileSearch,
      active: sec >= t4 && sec < t5,
      badge: "Enacted Ordinances",
      steps: [
        "Enacted Polangui Ordinances (046, 11-062, 11-063)",
        "Hierarchical Schema (Preamble, Whereas, Sections)",
        "Human-Judged Ground-Truth Query Collection",
      ],
      techTag: "SQLite FTS5 + Schema Spec",
    },
    {
      num: "02",
      title: "Bilingual OCR & Vector Pipeline",
      sub: "FastEmbed 384-d + Convex & SQLite FTS5",
      icon: Database,
      active: sec >= t5 && sec < t6,
      badge: "Neural Retrieval",
      steps: [
        "PyMuPDF + Bilingual Tesseract OCR Spell Repair",
        "Wet-Signature Isolation & Privacy Filtering",
        "384-d BAAI/bge-small-en-v1.5 + Lexical Reranking",
      ],
      techTag: "FastEmbed + Convex Cloud DB",
    },
    {
      num: "03",
      title: "IR & ISO/IEC 25010 Evaluation",
      sub: "Controlled 4-Mode Benchmark & Survey",
      icon: BarChart3,
      active: sec >= t6,
      badge: "Empirical Validation",
      steps: [
        "Keyword, Vector, Hybrid & Hybrid + Rerank Modes",
        "Precision@K, Recall@K, MRR, nDCG@K & Latency",
        "8 ISO/IEC 25010 Software Quality Dimensions",
      ],
      techTag: "4 Search Configurations + Survey",
    },
  ];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: THEME.bg,
        backgroundImage: `radial-gradient(circle at 50% 45%, rgba(20, 104, 58, 0.08), transparent 45%)`,
        fontFamily: THEME.fontSans,
        color: THEME.ink900,
      }}
    >
      {/* Fixed Chrome Top Header */}
      <TopHeaderBar activeTab="Search" />

      {/* Fixed Top Title Strip (Never shifted or clipped by zoom) */}
      <div
        style={{
          padding: "20px 72px 10px 72px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          zIndex: 10,
        }}
      >
        <div>
          <span
            style={{
              fontSize: 12,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: THEME.civic700,
            }}
          >
            Research Significance &amp; Objectives
          </span>
          <h2
            style={{
              fontFamily: THEME.fontSerif,
              fontSize: 36,
              fontWeight: 700,
              color: THEME.ink950,
              margin: "3px 0 0 0",
            }}
          >
            {!isObjectivesPhase
              ? "Practical Value & Privacy Safeguards for LGU Polangui"
              : "Three Core Objectives of the Study"}
          </h2>
        </div>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            borderRadius: 999,
            backgroundColor: THEME.paper,
            border: `1.5px solid ${THEME.civic500}`,
            color: THEME.civic700,
            fontSize: 13,
            fontWeight: 700,
            boxShadow: "0 4px 12px rgba(20, 104, 58, 0.1)",
          }}
        >
          <ShieldCheck size={16} />
          <span>In Collaboration with LGU Polangui</span>
        </div>
      </div>

      {/* Dynamic 3D Camera Viewport for Content Cards */}
      <div
        style={{
          width: "100%",
          height: "calc(100% - 150px)",
          perspective: 1200,
          perspectiveOrigin: "50% 50%",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            padding: "14px 84px 90px 84px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            transformOrigin: `${cameraOriginX}% ${cameraOriginY}%`,
            transform: `scale(${cameraZoom}) rotateX(${cameraTiltX}deg) rotateY(${cameraTiltY}deg)`,
            transition: "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {!isObjectivesPhase ? (
            /* PHASE 1 (Ticks 0 - 2): 4-Node Stakeholder & Privacy Impact Grid */
            <div
              style={{
                flex: 1,
                marginTop: 18,
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 20,
                alignItems: "stretch",
              }}
            >
              {stakeholders.map((s) => {
                const Icon = s.icon;
                return (
                  <div
                    key={s.title}
                    style={{
                      backgroundColor: THEME.paper,
                      borderRadius: 22,
                      border: s.active
                        ? `3px solid ${THEME.civic600}`
                        : `1.5px solid ${THEME.border}`,
                      padding: "26px 30px",
                      boxShadow: s.active
                        ? "0 28px 60px -16px rgba(20, 104, 58, 0.35)"
                        : "0 8px 24px -16px rgba(15, 23, 42, 0.08)",
                      transform: s.active ? "scale(1.03) translateZ(20px)" : "scale(1.0)",
                      transformStyle: "preserve-3d",
                      transition: "all 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 14,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                          <div
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: 14,
                              backgroundColor: s.active ? THEME.civic500 : THEME.secondaryBg,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: s.active ? "#ffffff" : THEME.ink600,
                              boxShadow: s.active ? "0 8px 20px -4px rgba(20, 104, 58, 0.4)" : "none",
                              transition: "all 0.3s ease",
                            }}
                          >
                            <Icon size={24} />
                          </div>
                          <div>
                            <h3
                              style={{
                                fontFamily: THEME.fontSerif,
                                fontSize: 23,
                                fontWeight: 700,
                                color: THEME.ink950,
                                margin: 0,
                              }}
                            >
                              {s.title}
                            </h3>
                            <div style={{ fontSize: 12, fontWeight: 700, color: THEME.civic700, marginTop: 2 }}>
                              {s.stats}
                            </div>
                          </div>
                        </div>

                        <span
                          style={{
                            padding: "6px 14px",
                            borderRadius: 999,
                            backgroundColor: s.active ? THEME.civic600 : THEME.secondaryBg,
                            color: s.active ? "#ffffff" : THEME.ink600,
                            fontSize: 12,
                            fontWeight: 700,
                            letterSpacing: "0.02em",
                            boxShadow: s.active ? "0 4px 12px rgba(20, 104, 58, 0.3)" : "none",
                          }}
                        >
                          {s.badge}
                        </span>
                      </div>

                      <p style={{ fontSize: 14.5, color: THEME.ink700, margin: 0, lineHeight: 1.6 }}>
                        {s.metric}
                      </p>
                    </div>

                    {s.active && (
                      <div
                        style={{
                          marginTop: 14,
                          padding: "8px 14px",
                          borderRadius: 10,
                          backgroundColor: THEME.civic50,
                          border: `1px solid ${THEME.civic200}`,
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontSize: 12.5,
                          fontWeight: 700,
                          color: THEME.civic800,
                        }}
                      >
                        <Sparkles size={14} color={THEME.civic600} />
                        <span>Active Focus · Research Contribution for Polangui</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* PHASE 2 (Ticks 3 - 5): 3 Specific Objectives Technical Roadmap */
            <div
              style={{
                flex: 1,
                marginTop: 18,
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 24,
                alignItems: "center",
              }}
            >
              {objectives.map((obj) => {
                const Icon = obj.icon;
                return (
                  <div
                    key={obj.num}
                    style={{
                      backgroundColor: THEME.paper,
                      borderRadius: 24,
                      border: obj.active
                        ? `3px solid ${THEME.civic600}`
                        : `1.5px solid ${THEME.border}`,
                      padding: "28px",
                      boxShadow: obj.active
                        ? "0 30px 65px -18px rgba(20, 104, 58, 0.4)"
                        : "0 10px 28px -18px rgba(15, 23, 42, 0.08)",
                      transform: obj.active ? "scale(1.04) translateZ(24px)" : "scale(1.0)",
                      transformStyle: "preserve-3d",
                      transition: "all 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 14,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 38,
                          fontFamily: THEME.fontSerif,
                          fontWeight: 800,
                          color: obj.active ? THEME.civic600 : THEME.ink400,
                          letterSpacing: "-0.03em",
                        }}
                      >
                        {obj.num}
                      </span>
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 14,
                          backgroundColor: obj.active ? THEME.civic500 : THEME.secondaryBg,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: obj.active ? "#ffffff" : THEME.ink600,
                          boxShadow: obj.active ? "0 8px 20px -4px rgba(20, 104, 58, 0.35)" : "none",
                        }}
                      >
                        <Icon size={24} />
                      </div>
                    </div>

                    <h3
                      style={{
                        fontFamily: THEME.fontSerif,
                        fontSize: 22,
                        fontWeight: 700,
                        color: THEME.ink950,
                        margin: "0 0 6px 0",
                      }}
                    >
                      {obj.title}
                    </h3>
                    <div style={{ fontSize: 13, fontWeight: 700, color: THEME.civic700, marginBottom: 16 }}>
                      {obj.sub}
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 11, marginBottom: 18 }}>
                      {obj.steps.map((st) => (
                        <div
                          key={st}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 9,
                            fontSize: 13,
                            color: THEME.ink800,
                            fontWeight: 500,
                            lineHeight: 1.45,
                          }}
                        >
                          <CheckCircle2
                            size={16}
                            color={obj.active ? THEME.civic600 : THEME.ink400}
                            style={{ flexShrink: 0, marginTop: 2 }}
                          />
                          <span>{st}</span>
                        </div>
                      ))}
                    </div>

                    <div
                      style={{
                        padding: "6px 12px",
                        borderRadius: 8,
                        backgroundColor: obj.active ? THEME.civic50 : THEME.secondaryBg,
                        border: `1px solid ${obj.active ? THEME.civic200 : THEME.border}`,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 12,
                        fontWeight: 700,
                        color: obj.active ? THEME.civic800 : THEME.ink600,
                      }}
                    >
                      <Layers size={13} color={obj.active ? THEME.civic600 : THEME.ink500} />
                      <span>{obj.techTag}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Fixed Teleprompter Bar */}
      <TeleprompterBar ticks={TELEPROMPTER_TICKS.SIGNIFICANCE_OBJECTIVES} />
    </AbsoluteFill>
  );
};
