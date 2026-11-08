import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import {
  BarChart3,
  Gauge,
  CheckCircle2,
  ShieldCheck,
  SlidersHorizontal,
  Activity,
  Calculator,
  Scale,
  Award,
  Layers,
  Sparkles,
  Zap,
} from "lucide-react";
import { THEME, TELEPROMPTER_TICKS } from "../constants";
import { TopHeaderBar, TeleprompterBar } from "../components/SharedUI";

export const SceneEvaluation: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const sec = frame / fps;

  const ticks = TELEPROMPTER_TICKS.EVALUATION;
  const t1 = ticks[1]?.startSec ?? 9.5;
  const t2 = ticks[2]?.startSec ?? 20.0;
  const t3 = ticks[3]?.startSec ?? 30.0;
  const t4 = ticks[4]?.startSec ?? 40.0;
  const t5 = ticks[5]?.startSec ?? 50.0;
  const t6 = ticks[6]?.startSec ?? 61.0;

  // Active Phase:
  // Phase 1 (Ticks 0-2): Relevance Judgment Matrix & Mathematical Formulas (P, R, F1, MRR, nDCG)
  // Phase 2 (Ticks 3-4): 4-Mode Ablation Experiments & Sub-200ms Latency
  // Phase 3 (Ticks 5-6): ISO/IEC 25010:2023 Quality Survey, Weighted Mean Formula & Likert Results
  const isPhase1 = sec < t3;
  const isPhase2 = sec >= t3 && sec < t5;
  const isPhase3 = sec >= t5;

  const subtleScale = interpolate(
    frame,
    [0, durationInFrames],
    [1.0, 1.035],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const modes = [
    {
      name: "1. Keyword Baseline (SQLite FTS5)",
      mechanism: "Exact Lexical Token & Stem Matching",
      role: "Baseline Control",
      score: "P@3: 68.2% · MRR: 0.71",
      winner: false,
    },
    {
      name: "2. Dense Vector (FastEmbed BGE-small)",
      mechanism: "384-d Cosine Similarity Search",
      role: "Semantic Ablation",
      score: "P@3: 84.6% · MRR: 0.88",
      winner: false,
    },
    {
      name: "3. Hybrid Fusion",
      mechanism: "Weighted Linear Combination (0.70 / 0.30)",
      role: "Dual-Signal Fusion",
      score: "P@3: 89.4% · MRR: 0.92",
      winner: false,
    },
    {
      name: "4. Hybrid + Rerank (Production Engine)",
      mechanism: "0.72 · Base + 0.28 · Exact Phrase & Bilingual Boost",
      role: "Full Pipeline Winner",
      score: "P@3: 94.8% · MRR: 0.96",
      winner: true,
    },
  ];

  const isoCharacteristics = [
    { name: "Functional Suitability", score: "4.88", desc: "Completeness, correctness & appropriateness" },
    { name: "Performance Efficiency", score: "4.82", desc: "Sub-200ms latency & low CPU utilization" },
    { name: "Interaction Capability", score: "4.86", desc: "Learnability, operability & clear UI guidance" },
    { name: "Reliability", score: "4.80", desc: "Fault tolerance & zero failed ingestion jobs" },
    { name: "Security", score: "4.92", desc: "RA 10173 wet-signature privacy protection" },
    { name: "Maintainability", score: "4.85", desc: "Modular Three-Tier codebase & clean APIs" },
    { name: "Compatibility", score: "4.84", desc: "Chrome, Edge & municipal office setups" },
    { name: "Portability", score: "4.78", desc: "CPU-only deployment on Windows & Linux" },
  ];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: THEME.bg,
        fontFamily: THEME.fontSans,
        color: THEME.ink900,
        overflow: "hidden",
      }}
    >
      <TopHeaderBar activeTab="Methodology" />

      {/* Main Content Area */}
      <div
        style={{
          flex: 1,
          width: "100%",
          height: "calc(100% - 64px)",
          position: "relative",
          transform: `scale(${subtleScale})`,
          transformOrigin: "50% 50%",
          padding: "24px 64px 84px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Top Title Strip */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: THEME.civic100,
                color: THEME.civic700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 6px rgba(20, 104, 58, 0.12)",
              }}
            >
              <BarChart3 size={24} strokeWidth={2.4} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.14em",
                    color: THEME.civic700,
                    backgroundColor: THEME.civic50,
                    padding: "4px 10px",
                    borderRadius: 6,
                    border: `1.5px solid ${THEME.civic200}`,
                  }}
                >
                  Chapter 3 · Dual Evaluation Framework
                </span>
                <span style={{ fontSize: 14, color: THEME.ink400 }}>•</span>
                <span style={{ fontSize: 14, color: THEME.ink600, fontWeight: 600 }}>
                  Relevance Matrix · F1 / MRR / nDCG Metrics · ISO/IEC 25010:2023 Survey
                </span>
              </div>
              <h2
                style={{
                  margin: "4px 0 0",
                  fontFamily: THEME.fontSerif,
                  fontSize: 30,
                  fontWeight: 800,
                  color: THEME.ink950,
                  letterSpacing: "-0.015em",
                }}
              >
                {isPhase1 && "Quantitative IR Benchmark: Relevance Matrix & Mathematical Formulas"}
                {isPhase2 && "4-Mode Empirical Ablation Experiments & Sub-200ms Latency"}
                {isPhase3 && "ISO/IEC 25010:2023 Software Quality Evaluation (Weighted Mean: 4.84 / 5.00)"}
              </h2>
            </div>
          </div>

          {/* Phase Indicators */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {[
              { id: 1, label: "IR Formulas & Matrix", active: isPhase1 },
              { id: 2, label: "4-Mode Ablation", active: isPhase2 },
              { id: 3, label: "ISO 25010 Survey", active: isPhase3 },
            ].map((p) => (
              <div
                key={p.id}
                style={{
                  padding: "8px 18px",
                  borderRadius: 24,
                  fontSize: 13.5,
                  fontWeight: 700,
                  backgroundColor: p.active ? THEME.civic600 : THEME.paper,
                  color: p.active ? "#ffffff" : THEME.ink600,
                  border: `1.5px solid ${p.active ? THEME.civic600 : THEME.border}`,
                  boxShadow: p.active ? "0 4px 12px rgba(30, 130, 76, 0.28)" : "none",
                }}
              >
                {p.id}. {p.label}
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic Multi-Phase Layout */}
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: 22, alignItems: "stretch" }}>
          {/* LEFT PANEL: Relevance Matrix & IR Formulas */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Relevance Judgment Matrix Card */}
            <div
              style={{
                backgroundColor: THEME.paper,
                borderRadius: 16,
                border: `2px solid ${THEME.border}`,
                padding: "20px 24px",
                boxShadow: "0 4px 14px rgba(15, 23, 42, 0.05)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Scale size={20} color={THEME.civic700} strokeWidth={2.4} />
                  <span style={{ fontSize: 15, fontWeight: 800, color: THEME.ink950, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    4-Point Relevance Judgment Matrix (Adapted Confusion Matrix)
                  </span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: THEME.civic700, backgroundColor: THEME.civic50, padding: "3px 10px", borderRadius: 6, border: `1px solid ${THEME.civic200}` }}>
                  Human Ground-Truth
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 14 }}>
                {[
                  { grade: "Grade 3", label: "Completely Relevant", color: THEME.civic700, bg: THEME.civic50, desc: "Direct statutory answer" },
                  { grade: "Grade 2", label: "Substantially Relevant", color: THEME.blue700, bg: THEME.blue50, desc: "Vital context / parent section" },
                  { grade: "Grade 1", label: "Partially Relevant", color: THEME.amber600, bg: THEME.amber100, desc: "Related penalty / definition" },
                  { grade: "Grade 0", label: "Not Relevant", color: THEME.rust700, bg: THEME.rust50, desc: "Lexical false positive" },
                ].map((g, i) => (
                  <div key={i} style={{ backgroundColor: g.bg, borderRadius: 10, padding: "10px 12px", border: `1.5px solid ${g.color}44` }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: g.color }}>{g.grade}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink900, margin: "3px 0" }}>{g.label}</div>
                    <div style={{ fontSize: 11.5, color: THEME.ink600, lineHeight: 1.35 }}>{g.desc}</div>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 13, color: THEME.ink700, display: "flex", gap: 16, borderTop: `1.5px solid ${THEME.border}`, paddingTop: 10 }}>
                <span><strong>Relevant:</strong> Grade &gt; 0 (TP / FN)</span>
                <span>•</span>
                <span><strong>Non-Relevant:</strong> Grade = 0 (FP / TN)</span>
                <span>•</span>
                <span><strong>Strict Citation Audit:</strong> 100% Page Accuracy</span>
              </div>
            </div>

            {/* Information Retrieval Mathematical Formulas Card */}
            <div
              style={{
                backgroundColor: THEME.paper,
                borderRadius: 16,
                border: `2px solid ${THEME.civic300}`,
                padding: "20px 24px",
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxShadow: "0 4px 14px rgba(15, 23, 42, 0.05)",
                background: "linear-gradient(180deg, #ffffff 0%, #f6fbf8 100%)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <Calculator size={20} color={THEME.civic700} strokeWidth={2.4} />
                <span style={{ fontSize: 15, fontWeight: 800, color: THEME.ink950, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Information Retrieval Mathematical Formulas
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {/* Precision & Recall */}
                <div style={{ backgroundColor: THEME.paper, padding: "12px 16px", borderRadius: 10, border: `1.5px solid ${THEME.border}` }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: THEME.civic700 }}>Precision &amp; Recall @ K</div>
                  <div style={{ fontSize: 15, fontFamily: THEME.fontMono, fontWeight: 700, color: THEME.ink950, margin: "6px 0 2px" }}>
                    Precision = TP / (TP + FP)
                  </div>
                  <div style={{ fontSize: 15, fontFamily: THEME.fontMono, fontWeight: 700, color: THEME.ink950 }}>
                    Recall = TP / (TP + FN)
                  </div>
                </div>

                {/* Balanced F1 Score */}
                <div style={{ backgroundColor: THEME.paper, padding: "12px 16px", borderRadius: 10, border: `2px solid ${THEME.civic300}` }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: THEME.civic700 }}>Balanced F1-Score</div>
                  <div style={{ fontSize: 16, fontFamily: THEME.fontMono, fontWeight: 800, color: THEME.civic600, margin: "6px 0 2px" }}>
                    F₁ = 2 · (P · R) / (P + R)
                  </div>
                  <div style={{ fontSize: 12, color: THEME.ink600 }}>Harmonic mean of precision &amp; recall</div>
                </div>

                {/* MRR Formula */}
                <div style={{ backgroundColor: THEME.paper, padding: "12px 16px", borderRadius: 10, border: `1.5px solid ${THEME.border}` }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: THEME.blue700 }}>Mean Reciprocal Rank (MRR)</div>
                  <div style={{ fontSize: 15, fontFamily: THEME.fontMono, fontWeight: 700, color: THEME.ink950, margin: "6px 0 2px" }}>
                    MRR = (1/|Q|) · Σ (1 / rankᵢ)
                  </div>
                  <div style={{ fontSize: 12, color: THEME.ink600 }}>Speed to first relevant provision</div>
                </div>

                {/* nDCG Formula */}
                <div style={{ backgroundColor: THEME.paper, padding: "12px 16px", borderRadius: 10, border: `1.5px solid ${THEME.border}` }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: THEME.blue700 }}>nDCG @ K (Graded Gain)</div>
                  <div style={{ fontSize: 15, fontFamily: THEME.fontMono, fontWeight: 700, color: THEME.ink950, margin: "6px 0 2px" }}>
                    nDCG@k = DCG@k / IDCG@k
                  </div>
                  <div style={{ fontSize: 12, color: THEME.ink600 }}>DCG@k = Σ (2^(rel_i) - 1) / log₂(i+1)</div>
                </div>
              </div>

              {/* Latency Banner */}
              <div style={{ marginTop: 14, padding: "12px 18px", borderRadius: 10, backgroundColor: THEME.civic50, border: `1.5px solid ${THEME.civic200}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 14.5, fontWeight: 700, color: THEME.civic900 }}>
                  ⚡ Mean Query Latency: <strong>148 ms</strong> (Sub-200ms Benchmark Exceeded)
                </span>
                <span style={{ fontSize: 13, fontWeight: 800, color: THEME.civic700, backgroundColor: THEME.paper, padding: "4px 12px", borderRadius: 6, border: `1px solid ${THEME.civic200}` }}>
                  CPU-Only Standard Hardware
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: 4-Mode Ablation & ISO 25010 Quality Model */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* 4 Retrieval Modes Comparison */}
            <div
              style={{
                backgroundColor: THEME.paper,
                borderRadius: 16,
                border: `2px solid ${THEME.border}`,
                padding: "20px 24px",
                boxShadow: "0 4px 14px rgba(15, 23, 42, 0.05)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: THEME.ink950, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  4-Mode Retrieval Ablation Comparison
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: THEME.civic700, backgroundColor: THEME.civic50, padding: "3px 10px", borderRadius: 6 }}>
                  Empirical Benchmark
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {modes.map((m, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "10px 16px",
                      borderRadius: 10,
                      border: m.winner ? `2.5px solid ${THEME.civic500}` : `1.5px solid ${THEME.border}`,
                      backgroundColor: m.winner ? THEME.civic50 : THEME.paper,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      boxShadow: m.winner ? "0 4px 12px rgba(20, 104, 58, 0.10)" : "none",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14.5, fontWeight: 800, color: m.winner ? THEME.civic800 : THEME.ink950 }}>
                        {m.name} {m.winner && "★"}
                      </div>
                      <div style={{ fontSize: 12.5, color: THEME.ink600, marginTop: 2 }}>{m.mechanism}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: m.winner ? THEME.civic700 : THEME.ink700 }}>
                        {m.score}
                      </div>
                      <div style={{ fontSize: 11.5, fontWeight: 600, color: m.winner ? THEME.civic600 : THEME.ink500 }}>{m.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ISO/IEC 25010 Software Quality & Weighted Mean */}
            <div
              style={{
                backgroundColor: THEME.paper,
                borderRadius: 16,
                border: `2px solid ${THEME.border}`,
                padding: "20px 24px",
                flex: 1,
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 4px 14px rgba(15, 23, 42, 0.05)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Award size={20} color={THEME.civic700} strokeWidth={2.4} />
                  <span style={{ fontSize: 15, fontWeight: 800, color: THEME.ink950, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    ISO/IEC 25010:2023 Quality Survey
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, fontFamily: THEME.fontMono, fontWeight: 700, color: THEME.ink700 }}>
                    M = Σ(w · x) / Σw
                  </span>
                  <span style={{ fontSize: 13.5, fontWeight: 800, color: "#fff", backgroundColor: THEME.civic600, padding: "4px 12px", borderRadius: 6, boxShadow: "0 2px 6px rgba(20, 104, 58, 0.25)" }}>
                    4.84 / 5.00 Excellent
                  </span>
                </div>
              </div>

              {/* 8 Characteristics Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, flex: 1 }}>
                {isoCharacteristics.map((c, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 8,
                      backgroundColor: THEME.secondaryBg,
                      border: `1.5px solid ${THEME.border}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: THEME.ink950 }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: THEME.ink600 }}>{c.desc}</div>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 800, color: THEME.civic700, marginLeft: 8 }}>
                      {c.score}
                    </span>
                  </div>
                ))}
              </div>

              {/* Likert Scale Reference */}
              <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1.5px solid ${THEME.border}`, display: "flex", justifyContent: "space-between", fontSize: 12, color: THEME.ink600 }}>
                <span>1.00–1.80: Poor</span>
                <span>1.81–2.60: Fair</span>
                <span>2.61–3.40: Good</span>
                <span>3.41–4.20: Very Good</span>
                <span style={{ fontWeight: 800, color: THEME.civic700 }}>4.21–5.00: Excellent ★</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <TeleprompterBar ticks={ticks} />
    </AbsoluteFill>
  );
};
