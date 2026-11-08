import React from "react";
import { Img, staticFile, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { ShieldCheck, Sun } from "lucide-react";
import { THEME, ScriptTick } from "../constants";

export const TopHeaderBar: React.FC<{
  activeTab?: string;
  statusText?: string;
}> = ({ activeTab = "Search" }) => {
  const navItems = ["Search", "Document repository", "Methodology"];

  return (
    <div
      style={{
        height: 64,
        backgroundColor: "rgba(255, 255, 255, 0.92)",
        borderBottom: `1px solid ${THEME.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 48px",
        fontFamily: THEME.fontSans,
        zIndex: 30,
      }}
    >
      {/* Exact BrandLogo from frontend/components/brand-logo.tsx */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "1px solid rgba(217, 119, 6, 0.3)",
            backgroundColor: THEME.paper,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
          }}
        >
          <Img
            src={staticFile("logo.png")}
            style={{ width: 36, height: 36, objectFit: "contain" }}
          />
        </div>
        <div style={{ lineHeight: 1.15 }}>
          <span
            style={{
              display: "block",
              fontFamily: THEME.fontSerif,
              fontSize: 16,
              fontWeight: 700,
              color: THEME.ink950,
              letterSpacing: "-0.01em",
            }}
          >
            OrdiSearch
          </span>
          <span
            style={{
              display: "block",
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              color: THEME.civic700,
            }}
          >
            Municipality of Polangui · Albay
          </span>
        </div>
      </div>

      {/* Exact Right Nav Links from frontend/components/site-header.tsx */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {navItems.map((item) => {
          const isActive =
            activeTab.toLowerCase().includes(item.toLowerCase()) ||
            (item === "Search" &&
              !activeTab.toLowerCase().includes("document") &&
              !activeTab.toLowerCase().includes("methodology"));
          return (
            <div
              key={item}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: isActive ? 600 : 500,
                backgroundColor: isActive ? THEME.civic50 : "transparent",
                color: isActive ? THEME.civic700 : THEME.ink600,
              }}
            >
              {item}
            </div>
          );
        })}

        <div
          style={{
            marginLeft: 8,
            paddingLeft: 12,
            borderLeft: `1px solid ${THEME.border}`,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {/* ThemeToggle button */}
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              border: `1px solid ${THEME.border}`,
              backgroundColor: THEME.paper,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: THEME.ink700,
            }}
          >
            <Sun size={16} strokeWidth={2} />
          </div>

          {/* Admin Portal Button */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 8,
              border: `1px solid ${THEME.borderStrong}`,
              backgroundColor: THEME.paper,
              fontSize: 12,
              fontWeight: 600,
              color: THEME.ink800,
              boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
            }}
          >
            <ShieldCheck size={14} color={THEME.civic600} strokeWidth={2.2} />
            Admin Portal
          </div>
        </div>
      </div>
    </div>
  );
};

// Clean, unboxed closed caption teleprompter (Large, crisp, high-visibility text without pill shapes)
export const TeleprompterBar: React.FC<{
  ticks: ScriptTick[];
  sceneLabel?: string;
}> = ({ ticks }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentSec = frame / fps;

  const activeTick =
    ticks.find((t) => currentSec >= t.startSec && currentSec < t.endSec) ||
    ticks[ticks.length - 1];

  const tickStartFrame = activeTick.startSec * fps;
  const fade = spring({
    frame: Math.max(0, frame - tickStartFrame),
    fps,
    config: { damping: 20, stiffness: 160 },
  });

  return (
    <div
      style={{
        position: "absolute",
        bottom: 24,
        left: 80,
        right: 80,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
        zIndex: 100,
      }}
    >
      <div
        style={{
          maxWidth: 1400,
          textAlign: "center",
          fontFamily: THEME.fontSans,
          fontSize: 29,
          fontWeight: 700,
          color: THEME.ink950,
          lineHeight: 1.35,
          letterSpacing: "-0.015em",
          opacity: interpolate(fade, [0, 1], [0.25, 1]),
          transform: `translateY(${interpolate(fade, [0, 1], [4, 0])}px)`,
          textShadow:
            "0 2px 14px rgba(255, 255, 255, 1), 0 0px 8px rgba(255, 255, 255, 1), 0 1px 3px rgba(255, 255, 255, 0.98), 0 0 24px rgba(255, 255, 255, 0.95)",
        }}
      >
        {activeTick.text}
      </div>
    </div>
  );
};
