import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import {
  BookOpenCheck,
  ShieldCheck,
  Scale,
  Database,
  Lock,
  Sparkles,
} from "lucide-react";
import { THEME, RESEARCHERS, TELEPROMPTER_TICKS } from "../constants";
import { TopHeaderBar, TeleprompterBar } from "../components/SharedUI";

export const SceneConclusion: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sec = frame / fps;

  const cardSpring = spring({ frame, fps, config: { damping: 14, stiffness: 100 } });

  const ticks = TELEPROMPTER_TICKS.CONCLUSION;
  const outroSec = ticks[1]?.startSec ?? 9.8;
  const isResearchersOutro = sec >= outroSec;

  // Subtle, balanced cinematic camera push-in across Conclusion (Max 1.04x, centered)
  const cameraZoom = interpolate(
    sec,
    [0, 2, outroSec - 1, outroSec + 1, 38],
    [1.0, 1.02, 1.02, 1.04, 1.04],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const cameraOriginX = 50;
  const cameraOriginY = 50;

  const cameraTiltX = interpolate(
    sec,
    [0, outroSec - 1, outroSec + 1, 38],
    [0, 0.15, -0.15, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: THEME.bg,
        backgroundImage: `radial-gradient(circle at 20% 20%, rgba(20, 104, 58, 0.08), transparent 38%), radial-gradient(circle at 80% 20%, rgba(217, 119, 6, 0.06), transparent 34%)`,
        fontFamily: THEME.fontSans,
        color: THEME.ink900,
      }}
    >
      <TopHeaderBar activeTab="Search" />

      {/* Dynamic 3D Camera Viewport */}
      <div
        style={{
          width: "100%",
          height: "calc(100% - 64px)",
          perspective: 1200,
          perspectiveOrigin: "50% 50%",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            padding: "24px 90px 105px 90px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
            transformOrigin: `${cameraOriginX}% ${cameraOriginY}%`,
            transform: `scale(${cameraZoom}) rotateX(${cameraTiltX}deg)`,
            transition: "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <div
            style={{
              opacity: cardSpring,
              transform: `translateY(${interpolate(cardSpring, [0, 1], [24, 0])}px)`,
              background: THEME.surface,
              border: `1.5px solid ${THEME.civic200}`,
              borderRadius: 28,
              padding: "36px 52px",
              boxShadow: "0 24px 60px -30px rgba(15, 23, 42, 0.2)",
              maxWidth: 1420,
              width: "100%",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 14 }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  border: "2px solid rgba(217, 119, 6, 0.4)",
                  backgroundColor: THEME.paper,
                  padding: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 12px rgba(217, 119, 6, 0.15)",
                }}
              >
                <Img src={staticFile("logo.png")} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              </div>
              <div
                style={{
                  padding: "6px 16px",
                  borderRadius: 999,
                  background: THEME.civic50,
                  border: `1px solid ${THEME.civic200}`,
                  color: THEME.civic700,
                  fontSize: 12.5,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <BookOpenCheck size={14} strokeWidth={2.3} />
                In Collaboration with the Local Government Unit of Polangui
              </div>
            </div>

            <h1
              style={{
                fontFamily: THEME.fontSerif,
                fontSize: 54,
                fontWeight: 700,
                color: THEME.ink950,
                margin: "0 0 10px 0",
                letterSpacing: "-0.02em",
              }}
            >
              OrdiSearch<span style={{ color: THEME.civic600 }}>.</span>
            </h1>
            <p style={{ fontSize: 18.5, color: THEME.ink600, maxWidth: 1020, margin: "0 auto 22px auto", lineHeight: 1.5 }}>
              A Vector Search-Based Local Ordinance and Policy Retrieval System for the Local Government Unit, Sangguniang Bayan, and Citizens of Polangui, Albay.
            </p>

            {/* 3 Summary Badges */}
            <div style={{ display: "flex", justifyContent: "center", gap: 14, marginBottom: 26 }}>
              {[
                { label: "Bilingual OCR + Section-Grounded Citations", icon: Scale },
                { label: "384-d BGE-small + Convex & SQLite FTS5 Hybrid Search", icon: Database },
                { label: "Wet-Signature & Public PDF Privacy Protection", icon: Lock },
              ].map((b) => {
                const IconComp = b.icon;
                return (
                  <span
                    key={b.label}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 999,
                      background: THEME.civic50,
                      border: `1px solid ${THEME.civic200}`,
                      color: THEME.civic700,
                      fontSize: 13,
                      fontWeight: 700,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <IconComp size={15} strokeWidth={2.2} />
                    {b.label}
                  </span>
                );
              })}
            </div>

            {/* 3 Researcher Cards — Bicol University Polangui */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 22, perspective: 1000 }}>
              {RESEARCHERS.map((r, idx) => {
                const isHighlight = isResearchersOutro && idx === 0;
                return (
                  <div
                    key={r.name}
                    style={{
                      background: isHighlight ? "#ffffff" : THEME.surfaceMuted,
                      border: isHighlight
                        ? `2.5px solid ${THEME.civic600}`
                        : `1.5px solid ${THEME.border}`,
                      borderRadius: 20,
                      padding: "16px 20px",
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      textAlign: "left",
                      transform: isResearchersOutro
                        ? `perspective(800px) rotateY(${idx === 0 ? 1.5 : idx === 2 ? -1.5 : 0}deg) translateZ(${idx === 0 ? 24 : 12}px) scale(${idx === 0 ? 1.03 : 1.0})`
                        : `perspective(800px) rotateY(${idx === 0 ? 2.5 : idx === 2 ? -2.5 : 0}deg) translateZ(10px)`,
                      transformStyle: "preserve-3d",
                      boxShadow: isHighlight
                        ? "0 22px 50px -14px rgba(20, 104, 58, 0.35)"
                        : "0 18px 40px -14px rgba(15, 23, 42, 0.14)",
                      transition: "all 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
                    }}
                  >
                    <div
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: "50%",
                        overflow: "hidden",
                        border: `2.5px solid ${THEME.civic600}`,
                        flexShrink: 0,
                        boxShadow: "0 4px 12px rgba(20, 104, 58, 0.2)",
                      }}
                    >
                      <Img src={staticFile(r.photo)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                    <div>
                      <div style={{ fontFamily: THEME.fontSerif, fontSize: 23, fontWeight: 700, color: THEME.ink950 }}>
                        {r.name}
                      </div>
                      <div
                        style={{
                          fontSize: 12.5,
                          fontWeight: 700,
                          color: THEME.civic700,
                          marginTop: 2,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <ShieldCheck size={13} />
                        {r.role}
                      </div>
                      <div style={{ fontSize: 12.5, color: THEME.ink600, fontWeight: 600, marginTop: 2 }}>
                        {r.affiliation}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <TeleprompterBar ticks={TELEPROMPTER_TICKS.CONCLUSION} />
    </AbsoluteFill>
  );
};
