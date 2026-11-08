import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import {
  BookOpen,
  FileCheck2,
  Building2,
  Scale,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Layers,
  Database,
  Cpu,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  TrendingUp,
} from "lucide-react";
import { THEME, TELEPROMPTER_TICKS } from "../constants";
import { TopHeaderBar, TeleprompterBar } from "../components/SharedUI";

export const SceneLiteratureFramework: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const currentSec = frame / fps;

  // Very subtle, comfortable camera push-in (1.00 -> 1.035) with centered origin
  const subtleScale = interpolate(
    frame,
    [0, durationInFrames],
    [1.0, 1.035],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Synchronized sub-phase transitions locked to new 10-minute speech timestamps:
  // Phase 1 (0s - 70.2s): Related Literature Precedents (Dela Peña, Dandan, DILG MC, Sovereignty, Lim, Agpaoa)
  // Phase 2 (70.2s - 111.6s): Empirical Studies (Roque 2024, Structural Chunking, Wong 2025) & The Critical Research Gap
  // Phase 3 (111.6s - 138s): Figure 1 Conceptual Paradigm (Input-Process-Output Model & Continuous Feedback Loop)
  const isPhase1 = currentSec < 70.2;
  const isPhase2 = currentSec >= 70.2 && currentSec < 111.6;
  const isPhase3 = currentSec >= 111.6;

  const phase1Fade = interpolate(currentSec, [0, 1, 69.2, 70.2], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const phase2Fade = interpolate(currentSec, [70.0, 71.0, 110.6, 111.6], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const phase3Fade = interpolate(currentSec, [111.4, 112.4, 137, 138], [0, 1, 1, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const ticks = (TELEPROMPTER_TICKS as any).LITERATURE_FRAMEWORK || [];

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

      {/* Camera-Controlled Content Area */}
      <div
        style={{
          flex: 1,
          width: "100%",
          height: "calc(100% - 64px)",
          position: "relative",
          transform: `scale(${subtleScale})`,
          transformOrigin: "50% 50%",
          padding: "26px 64px 84px",
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
              <BookOpen size={24} strokeWidth={2.4} />
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
                  Chapter 2 · Literature &amp; Theoretical Framework
                </span>
                <span style={{ fontSize: 14, color: THEME.ink400 }}>•</span>
                <span style={{ fontSize: 14, color: THEME.ink600, fontWeight: 600 }}>
                  Philippine Legal AI · LGU Precedents · IPO Conceptual Model
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
                {isPhase1 && "Related Literature: Institutional Precedents & Legal AI Principles"}
                {isPhase2 && "Related Studies: Empirical Chunking Gains & The Critical Research Gap"}
                {isPhase3 && "Figure 1: Conceptual Paradigm (Input–Process–Output Framework)"}
              </h2>
            </div>
          </div>

          {/* Phase Badge Tracker */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {[
              { id: 1, label: "Literature", active: isPhase1 },
              { id: 2, label: "Studies & Gap", active: isPhase2 },
              { id: 3, label: "Figure 1 IPO", active: isPhase3 },
            ].map((p) => (
              <div
                key={p.id}
                style={{
                  padding: "8px 18px",
                  borderRadius: 24,
                  fontSize: 14,
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

        {/* PHASE 1: High-Visibility Literature Precedents */}
        {isPhase1 && (
          <div
            style={{
              opacity: phase1Fade,
              flex: 1,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gridTemplateRows: "1fr 1fr",
              gap: 18,
              alignItems: "stretch",
            }}
          >
            {/* Card 1: Dela Peña 2025 */}
            <div
              style={{
                backgroundColor: THEME.paper,
                borderRadius: 16,
                border: `2px solid ${THEME.civic200}`,
                padding: "22px 26px",
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 4px 14px rgba(15, 23, 42, 0.05)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: THEME.civic700, backgroundColor: THEME.civic50, padding: "4px 12px", borderRadius: 6, border: `1px solid ${THEME.civic200}` }}>
                  Bicol LGU Precedent · ISO 25010
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: THEME.ink500 }}>Paracale, Camarines Norte (2025)</span>
              </div>
              <h3 style={{ margin: "0 0 8px", fontSize: 21, fontWeight: 800, color: THEME.ink950 }}>
                Dela Peña (2025) · Municipal E-Governance
              </h3>
              <p style={{ margin: 0, fontSize: 15.5, color: THEME.ink700, lineHeight: 1.5, flex: 1 }}>
                Assessed municipal digital transformation across 24 employees using a 5-point Likert scale against the <strong>ISO/IEC 25010</strong> model. Demonstrated strong feasibility and acceptance in a nearby Bicol LGU.
              </p>
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1.5px solid ${THEME.border}`, fontSize: 14, fontWeight: 700, color: THEME.civic700 }}>
                Direct regional precedent for OrdiSearch's ISO 25010 evaluation design
              </div>
            </div>

            {/* Card 2: Dandan et al. 2026 */}
            <div
              style={{
                backgroundColor: THEME.paper,
                borderRadius: 16,
                border: `2px solid ${THEME.blue100}`,
                padding: "22px 26px",
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 4px 14px rgba(15, 23, 42, 0.05)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: THEME.blue700, backgroundColor: THEME.blue50, padding: "4px 12px", borderRadius: 6, border: `1px solid ${THEME.blue100}` }}>
                  Dual-Group Evaluator Framework
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: THEME.ink500 }}>Vallehermoso LGU (2026)</span>
              </div>
              <h3 style={{ margin: "0 0 8px", fontSize: 21, fontWeight: 800, color: THEME.ink950 }}>
                Dandan et al. (2026) · Dual Stakeholder Model
              </h3>
              <p style={{ margin: 0, fontSize: 15.5, color: THEME.ink700, lineHeight: 1.5, flex: 1 }}>
                Pioneered dual evaluation: <strong>administrative end-users</strong> rated functional suitability and usability, while <strong>IT experts</strong> assessed maintainability and security under ISO 25010.
              </p>
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1.5px solid ${THEME.border}`, fontSize: 14, fontWeight: 700, color: THEME.blue700 }}>
                Adopted for Sangguniang Bayan personnel + IT expert testing
              </div>
            </div>

            {/* Card 3: DILG MC 2026-041 */}
            <div
              style={{
                backgroundColor: THEME.paper,
                borderRadius: 16,
                border: `2px solid ${THEME.civic400}`,
                padding: "22px 26px",
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 4px 14px rgba(15, 23, 42, 0.05)",
                background: "linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: THEME.civic800, backgroundColor: THEME.civic100, padding: "4px 12px", borderRadius: 6 }}>
                  National Policy Driver · July 2026
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: THEME.civic700 }}>VMLP &amp; UP NCPAG</span>
              </div>
              <h3 style={{ margin: "0 0 8px", fontSize: 21, fontWeight: 800, color: THEME.ink950 }}>
                DILG Memorandum Circular No. 2026-041
              </h3>
              <p style={{ margin: 0, fontSize: 15.5, color: THEME.ink700, lineHeight: 1.5, flex: 1 }}>
                Established the national <strong>e-Legis Reference System</strong>. Mandates AI-assisted municipal repositories and highlights the necessity for local natural-language lookup with strict source document traceability.
              </p>
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1.5px solid ${THEME.civic200}`, fontSize: 14, fontWeight: 700, color: THEME.civic700 }}>
                Validates OrdiSearch as an essential municipal-level retrieval engine
              </div>
            </div>

            {/* Card 4: Lim 2025 & Agpaoa 2025 */}
            <div
              style={{
                backgroundColor: THEME.paper,
                borderRadius: 16,
                border: `2px solid ${THEME.border}`,
                padding: "22px 26px",
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 4px 14px rgba(15, 23, 42, 0.05)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: THEME.rust700, backgroundColor: THEME.rust50, padding: "4px 12px", borderRadius: 6, border: `1px solid ${THEME.rust100}` }}>
                  Legal AI Constraints &amp; RAG
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: THEME.ink500 }}>Lim (2025) &amp; Agpaoa (2025)</span>
              </div>
              <h3 style={{ margin: "0 0 8px", fontSize: 21, fontWeight: 800, color: THEME.ink950 }}>
                Extractive Retrieval vs. Generative Hallucination
              </h3>
              <p style={{ margin: 0, fontSize: 15.5, color: THEME.ink700, lineHeight: 1.5, flex: 1 }}>
                Lim proved training LLMs on Philippine law is cost-prohibitive, making <strong>RAG and extractive search</strong> the gold standard for zero hallucinations. Agpaoa established LGU metrics: IR precision, sub-second latency, and bilingual resilience.
              </p>
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1.5px solid ${THEME.border}`, fontSize: 14, fontWeight: 700, color: THEME.rust600 }}>
                Ensures OrdiSearch provides strictly verified statutory text, not generated opinions
              </div>
            </div>
          </div>
        )}

        {/* PHASE 2: Empirical Studies & The Critical Research Gap */}
        {isPhase2 && (
          <div
            style={{
              opacity: phase2Fade,
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            {/* Top Row: Roque 2024 Highlight Card + Wong 2025 */}
            <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 20 }}>
              {/* Roque et al. 2024 */}
              <div
                style={{
                  backgroundColor: THEME.paper,
                  borderRadius: 16,
                  border: `2.5px solid ${THEME.civic500}`,
                  padding: "24px 28px",
                  boxShadow: "0 6px 18px rgba(30, 130, 76, 0.10)",
                  background: "linear-gradient(180deg, #ffffff 0%, #f3faf6 100%)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: THEME.civic800, backgroundColor: THEME.civic100, padding: "4px 12px", borderRadius: 6 }}>
                    Closest Philippine Empirical Study
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: THEME.ink500 }}>PACLIC 2024</span>
                </div>
                <h3 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 800, color: THEME.ink950 }}>
                  Roque et al. (2024) · Philippine Tax Code Benchmark
                </h3>
                <p style={{ margin: "0 0 16px", fontSize: 15.5, color: THEME.ink700, lineHeight: 1.5 }}>
                  Tested embedding models across 1,020 bar exam queries. Discovered that <strong>fine-grained section chunking</strong> provided the single largest retrieval improvement over the entire statutory corpus:
                </p>
                <div style={{ display: "flex", gap: 20, backgroundColor: THEME.paper, padding: "14px 20px", borderRadius: 12, border: `1.5px solid ${THEME.civic300}` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink500, textTransform: "uppercase" }}>Top-1 Accuracy Jump</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: THEME.civic700, margin: "2px 0" }}>+13.0%</div>
                    <div style={{ fontSize: 12.5, color: THEME.ink600 }}>From structural subsection splitting</div>
                  </div>
                  <div style={{ width: 1.5, backgroundColor: THEME.border }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink500, textTransform: "uppercase" }}>MRR Gain</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: THEME.civic700, margin: "2px 0" }}>+0.14 MRR</div>
                    <div style={{ fontSize: 12.5, color: THEME.ink600 }}>Reached 0.76 Mean Reciprocal Rank</div>
                  </div>
                </div>
              </div>

              {/* Wong 2025 & Samuel Reign 2024 */}
              <div
                style={{
                  backgroundColor: THEME.paper,
                  borderRadius: 16,
                  border: `2px solid ${THEME.border}`,
                  padding: "24px 28px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: "0 4px 14px rgba(15, 23, 42, 0.05)",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: THEME.blue700, backgroundColor: THEME.blue50, padding: "4px 12px", borderRadius: 6 }}>
                      Turnaround Benchmarks
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: THEME.ink500 }}>Wong (2025)</span>
                  </div>
                  <h4 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 800, color: THEME.ink950 }}>
                    Philippine Reclamation Authority (PRA)
                  </h4>
                  <p style={{ margin: 0, fontSize: 15, color: THEME.ink700, lineHeight: 1.5 }}>
                    Proved that digitized, structured policy records cut retrieval turnaround from <strong>16.33 to 7.73 minutes</strong>.
                  </p>
                </div>
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1.5px solid ${THEME.border}` }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink500, textTransform: "uppercase" }}>Samuel Reign &amp; Centeno (2024)</div>
                  <p style={{ margin: "4px 0 0", fontSize: 14.5, color: THEME.ink700, lineHeight: 1.45 }}>
                    Paired Tesseract OCR with Tagalog chatbot, but <strong>relied on keyword matching without dense vector semantic ranking</strong>.
                  </p>
                </div>
              </div>
            </div>

            {/* High-Visibility Research Gap Banner */}
            <div
              style={{
                backgroundColor: "#fffdf0",
                borderRadius: 16,
                border: `3px solid ${THEME.gold500}`,
                padding: "24px 32px",
                display: "flex",
                alignItems: "center",
                gap: 24,
                boxShadow: "0 6px 20px rgba(217, 119, 6, 0.16)",
              }}
            >
              <div
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 16,
                  backgroundColor: THEME.gold100,
                  color: THEME.gold700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <AlertCircle size={34} strokeWidth={2.4} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.14em", color: THEME.gold700 }}>
                  The Identified Research Gap Addressed by This Study
                </div>
                <h3 style={{ margin: "4px 0 8px", fontSize: 23, fontWeight: 800, color: THEME.ink950 }}>
                  No Prior Semantic Vector Retrieval System Exists for Philippine Municipal Ordinances
                </h3>
                <p style={{ margin: 0, fontSize: 16, color: THEME.ink800, lineHeight: 1.55 }}>
                  Prior local work either focused on <strong>national statutes without a deployed municipal application</strong> (Roque et al., 2024), or managed local records via <strong>keyword matching without semantic vector ranking</strong> (Samuel Reign &amp; Centeno, 2024; Wong, 2025). <strong>OrdiSearch directly bridges this gap</strong> by pairing dense vector retrieval with an empirical IR and ISO/IEC 25010 dual evaluation for LGU Polangui.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* PHASE 3: Figure 1 Conceptual Paradigm (Input - Process - Output Model) */}
        {isPhase3 && (
          <div
            style={{
              opacity: phase3Fade,
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            {/* 3 Large Columns: INPUT -> PROCESS (RAD) -> OUTPUT */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.25fr 1fr", gap: 22, flex: 1, alignItems: "stretch" }}>
              {/* Column 1: INPUT */}
              <div
                style={{
                  backgroundColor: THEME.paper,
                  borderRadius: 16,
                  border: `2.5px solid ${THEME.civic300}`,
                  padding: "22px 24px",
                  display: "flex",
                  flexDirection: "column",
                  boxShadow: "0 4px 14px rgba(15, 23, 42, 0.05)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, borderBottom: `2px solid ${THEME.civic100}`, paddingBottom: 10 }}>
                  <Database size={22} color={THEME.civic700} strokeWidth={2.4} />
                  <h4 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: THEME.civic800, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    1. Input Requirements
                  </h4>
                </div>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: 15, color: THEME.ink800, lineHeight: 1.7, flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                  <li><strong>Corpus:</strong> Digitized official ordinances from SB Polangui</li>
                  <li><strong>Metadata:</strong> Ordinance number, title, date, section index</li>
                  <li><strong>Queries:</strong> Everyday conversational questions in EN / FIL</li>
                  <li><strong>Model:</strong> FastEmbed BAAI/bge-small-en-v1.5 (384-d)</li>
                  <li><strong>Database:</strong> SQLite FTS5 BM25 + Convex Reactive Store</li>
                  <li><strong>Standards:</strong> ISO/IEC 25010:2023 &amp; IR Benchmark Metrics</li>
                </ul>
                <div style={{ marginTop: 12, padding: "8px 14px", borderRadius: 8, backgroundColor: THEME.civic50, fontSize: 13, fontWeight: 700, color: THEME.civic700, border: `1px solid ${THEME.civic200}` }}>
                  Official Ground-Truth Legislative Baseline
                </div>
              </div>

              {/* Column 2: PROCESS (RAD Lifecycle) */}
              <div
                style={{
                  backgroundColor: THEME.paper,
                  borderRadius: 16,
                  border: `2.5px solid ${THEME.blue600}`,
                  padding: "22px 24px",
                  display: "flex",
                  flexDirection: "column",
                  boxShadow: "0 6px 18px rgba(37, 99, 235, 0.10)",
                  background: "linear-gradient(180deg, #ffffff 0%, #f0f7ff 100%)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, borderBottom: `2px solid ${THEME.blue100}`, paddingBottom: 10 }}>
                  <Cpu size={22} color={THEME.blue700} strokeWidth={2.4} />
                  <h4 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: THEME.blue700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    2. Process: RAD Methodology
                  </h4>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, justifyContent: "space-between" }}>
                  {[
                    { phase: "Requirements Planning", desc: "Collaborate with SB staff on search & metadata requirements" },
                    { phase: "User Design & Prototyping", desc: "Interactive UI mockups, section chunking & vector search pipeline" },
                    { phase: "Construction & Development", desc: "PyMuPDF, Tesseract OCR, FastEmbed, Next.js 15 & FastAPI" },
                    { phase: "Testing & Evaluation", desc: "4-mode IR experiments (P@K, MRR, nDCG) & ISO survey" },
                  ].map((p, i) => (
                    <div
                      key={i}
                      style={{
                        backgroundColor: THEME.paper,
                        padding: "10px 14px",
                        borderRadius: 10,
                        border: `1.5px solid ${THEME.border}`,
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 800, backgroundColor: THEME.blue600, color: "#fff", width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {i + 1}
                      </span>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: THEME.ink950 }}>{p.phase}</div>
                        <div style={{ fontSize: 13, color: THEME.ink600, marginTop: 2 }}>{p.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Column 3: OUTPUT */}
              <div
                style={{
                  backgroundColor: THEME.paper,
                  borderRadius: 16,
                  border: `2.5px solid ${THEME.emerald500}`,
                  padding: "22px 24px",
                  display: "flex",
                  flexDirection: "column",
                  boxShadow: "0 4px 14px rgba(15, 23, 42, 0.05)",
                  background: "linear-gradient(180deg, #ffffff 0%, #ecfdf5 100%)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, borderBottom: `2px solid ${THEME.emerald100}`, paddingBottom: 10 }}>
                  <CheckCircle2 size={22} color={THEME.emerald700} strokeWidth={2.4} />
                  <h4 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: THEME.emerald700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    3. Output Deliverables
                  </h4>
                </div>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: 15, color: THEME.ink800, lineHeight: 1.7, flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                  <li><strong>Functional System:</strong> OrdiSearch Web Application</li>
                  <li><strong>Verified Citations:</strong> Verbatim provisions &amp; page references</li>
                  <li><strong>IR Benchmark Report:</strong> Precision, Recall, F1, MRR, nDCG</li>
                  <li><strong>Software Quality:</strong> ISO/IEC 25010:2023 evaluation report</li>
                  <li><strong>Beneficiary Impact:</strong> Fast, traceable records retrieval for SB</li>
                </ul>
                <div style={{ marginTop: 12, padding: "8px 14px", borderRadius: 8, backgroundColor: THEME.emerald50, fontSize: 13, fontWeight: 700, color: THEME.emerald700, border: `1px solid ${THEME.emerald200}` }}>
                  Empirically Validated Municipal Assistant
                </div>
              </div>
            </div>

            {/* Continuous Feedback Loop Bar */}
            <div
              style={{
                marginTop: 18,
                backgroundColor: THEME.paper,
                borderRadius: 14,
                border: `2px dashed ${THEME.civic600}`,
                padding: "12px 24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 20,
                boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", backgroundColor: THEME.civic100, color: THEME.civic700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <RefreshCw size={18} strokeWidth={2.8} />
                </div>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 800, color: THEME.civic800, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Continuous Feedback Loop:
                  </span>{" "}
                  <span style={{ fontSize: 14, color: THEME.ink700, fontWeight: 500 }}>
                    Evaluation metrics &amp; user feedback iteratively optimize chunk boundaries, vector indexing, and administrative search workflows.
                  </span>
                </div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 800, color: THEME.civic700, backgroundColor: THEME.civic50, padding: "6px 14px", borderRadius: 8, border: `1.5px solid ${THEME.civic300}`, flexShrink: 0 }}>
                Iterative RAD Improvement
              </span>
            </div>
          </div>
        )}
      </div>

      <TeleprompterBar ticks={ticks} />
    </AbsoluteFill>
  );
};
