import os
import sys
import json
import math
import wave
import numpy as np

SAMPLE_RATE = 24000
AUDIO_DIR = os.path.abspath(r"remotion-video\public\voiceover")
RAW_DIR = os.path.join(AUDIO_DIR, "raw")
CONSTANTS_PATH = os.path.abspath(r"remotion-video\src\constants.ts")

# 8 SCENES FOR 10-MINUTE MASTER VIDEO (Exactly 600s = 18,000 frames @ 30 FPS)
# Target breakdown:
# 1. INTRO: 48s
# 2. PROBLEM: 62s
# 3. SIGNIFICANCE_OBJECTIVES: 74s
# 4. LITERATURE_FRAMEWORK: 108s
# 5. METHODOLOGY: 82s
# 6. WALKTHROUGH: 106s
# 7. EVALUATION: 82s
# 8. CONCLUSION: 38s
# Total = 48 + 62 + 74 + 108 + 82 + 106 + 82 + 38 = 600 seconds = 10m 00s!

SCENE_CONFIGS = {
    "INTRO": {
        "file_key": "intro",
        "target_sec": 48,
        "ticks": [
            {
                "raw_file": "intro_0.wav",
                "speakerCue": "Enacted Municipal Ordinances",
                "display": "In local governance, every enacted municipal ordinance shapes infrastructure, public health, and daily community life.",
            },
            {
                "raw_file": "intro_1.wav",
                "speakerCue": "The Challenge of Static Scanned Binders",
                "display": "Yet once approved, these crucial policies often sit locked away inside multi-page scanned PDF binders—making them difficult to navigate and slow to verify.",
            },
            {
                "raw_file": "intro_2.wav",
                "speakerCue": "Introducing OrdiSearch",
                "display": "To solve this, we created OrdiSearch: an intelligent vector retrieval system developed in partnership with the Municipality of Polangui.",
            },
            {
                "raw_file": "intro_3.wav",
                "speakerCue": "Research Team · Bicol University",
                "display": "We are researchers from Bicol University. I'm Kirby Cope, alongside Arnel Hapin...",
            },
            {
                "raw_file": "intro_4.wav",
                "speakerCue": "Modernizing Legal Access",
                "display": "...and James Nebria, working together with local leaders to give citizens and municipal staff instant, citation-grounded access to the law.",
            },
        ],
    },
    "PROBLEM": {
        "file_key": "problem",
        "target_sec": 62,
        "ticks": [
            {
                "raw_file": "problem_0.wav",
                "speakerCue": "Real Local Ordinance Corpus",
                "display": "Take our actual local corpus—such as Ordinance 046 on municipal borrowing, 11-062 on maternal nutrition, and 11-063 on barangay waterworks.",
            },
            {
                "raw_file": "problem_1.wav",
                "speakerCue": "Bilingual Scanned Documents",
                "display": "These records span dozens of scanned pages blending English and Filipino statutory terms, tables, and formal preambles.",
            },
            {
                "raw_file": "problem_2.wav",
                "speakerCue": "Everyday Questions vs. Legal Terminology",
                "display": "When a resident or official asks a straightforward question—like 'Who is authorized to borrow funds for the sanitary landfill?'—they speak in everyday conversational language.",
            },
            {
                "raw_file": "problem_3.wav",
                "speakerCue": "Why Traditional Keyword Search Fails",
                "display": "Inside the actual document, the text speaks formally of entering an 'Omnibus Term Agreement with Land Bank.' Because the words don't match literally, standard keyword search fails completely.",
            },
            {
                "raw_file": "problem_4.wav",
                "speakerCue": "Bridging the Semantic Gap with Dense Vectors",
                "display": "OrdiSearch bridges this semantic gap using dense vectors—mapping the true intent of your question directly to the authoritative enacted provision.",
            },
        ],
    },
    "SIGNIFICANCE_OBJECTIVES": {
        "file_key": "significance",
        "target_sec": 74,
        "ticks": [
            {
                "raw_file": "significance_0.wav",
                "speakerCue": "Sub-Second Verified Statutory Lookup",
                "display": "Why is this a game changer? For local administration, it turns hours of digging through paper archives into sub-second, verified statutory lookup.",
            },
            {
                "raw_file": "significance_1.wav",
                "speakerCue": "Preventing Policy Conflicts and Duplication",
                "display": "For municipal lawmakers, it offers instant cross-referencing to check existing policies and prevent overlapping regulations before drafting new measures.",
            },
            {
                "raw_file": "significance_2.wav",
                "speakerCue": "Citizen Access with Privacy Protection",
                "display": "And for the public, it provides transparent access while strictly isolating physical wet signatures and raw files to safeguard official privacy.",
            },
            {
                "raw_file": "significance_new_stakeholders.wav",
                "speakerCue": "5 Core Stakeholder Beneficiary Groups",
                "display": "Chapter One defines five core beneficiary groups: SB records personnel, municipal officials, chief executives, policy researchers, and future scholars in local e-governance.",
            },
            {
                "raw_file": "significance_3.wav",
                "speakerCue": "Objective 1 · Legislative Corpus & Metadata",
                "display": "Our first objective established this legislative corpus, formalizing a structured metadata schema and a benchmark query collection.",
            },
            {
                "raw_file": "significance_4.wav",
                "speakerCue": "Objective 2 · Bilingual OCR & Semantic Pipeline",
                "display": "Our second objective engineered the retrieval pipeline—pairing bilingual OCR repair and section slicing with FastEmbed vectors and reactive synchronization.",
            },
            {
                "raw_file": "significance_5.wav",
                "speakerCue": "Objective 3 · IR Benchmark & ISO 25010 Quality",
                "display": "And our third objective evaluated retrieval accuracy and system quality across four distinct search configurations using the ISO twenty-five zero ten standard.",
            },
        ],
    },
    "LITERATURE_FRAMEWORK": {
        "file_key": "literature",
        "target_sec": 108,
        "ticks": [
            {
                "raw_file": "literature_0.wav",
                "speakerCue": "Academic Precedents in Local E-Governance",
                "display": "In Chapter Two, we ground our work in recent Philippine local governance literature—including Dela Peña's 2025 study in Paracale and Dandan's 2026 evaluation under ISO 25010.",
            },
            {
                "raw_file": "literature_1.wav",
                "speakerCue": "DILG MC 2026-041 & National Initiatives",
                "display": "At the national level, DILG Memorandum Circular 2026-041 established the e-Legis platform with the Vice Mayors' League, underscoring legislative digitization as a key priority.",
            },
            {
                "raw_file": "literature_2.wav",
                "speakerCue": "Philippine Legal AI Framework & RAG",
                "display": "Legal scholar Lim in 2025 demonstrated that training specialized models on Philippine law is cost-prohibitive, making Retrieval-Augmented Generation the ideal, legally sound path.",
            },
            {
                "raw_file": "literature_3.wav",
                "speakerCue": "LGU NLP Metrics & Bilingual Inclusivity",
                "display": "Furthermore, Agpaoa and Palaoag's 2025 framework highlights evaluating municipal language systems across IR accuracy, efficiency, user trust, and bilingual inclusivity.",
            },
            {
                "raw_file": "literature_4.wav",
                "speakerCue": "Roque et al. Chunking Insights",
                "display": "Among empirical studies, Roque and colleagues in 2024 tested embedding models over the Philippine Tax Code, revealing that fine-grained section chunking boosts Top-1 accuracy by 13% and MRR by 0.14.",
            },
            {
                "raw_file": "literature_5.wav",
                "speakerCue": "The Critical Research Gap",
                "display": "Yet a critical research gap remained: prior local work either indexed national statutes without user applications, or relied solely on keyword search without semantic vector ranking.",
            },
            {
                "raw_file": "literature_6.wav",
                "speakerCue": "Figure 1 · Input-Process-Output Framework",
                "display": "To address this gap, Figure 1 presents our Conceptual Paradigm: an Input-Process-Output model connecting municipal records, FastEmbed vectors, and ISO 25010 standards through RAD.",
            },
            {
                "raw_file": "literature_7.wav",
                "speakerCue": "Iterative Feedback & Continuous Refinement",
                "display": "A continuous feedback loop ensures that experimental retrieval findings and user evaluations directly refine chunk boundaries, vector indexing, and administrative search workflows.",
            },
        ],
    },
    "METHODOLOGY": {
        "file_key": "methodology",
        "target_sec": 82,
        "ticks": [
            {
                "raw_file": "methodology_0.wav",
                "speakerCue": "Tailored Municipal Processing Architecture",
                "display": "We followed Rapid Application Development, architecting an end-to-end processing pipeline tailored to Philippine local legislation.",
            },
            {
                "raw_file": "methodology_new_rad.wav",
                "speakerCue": "Stage 1 · Requirements Planning & Prototyping",
                "display": "Stage 1 begins with Requirements Planning and User Prototyping, designing interactive mockups alongside SB Polangui personnel before full-scale construction.",
            },
            {
                "raw_file": "methodology_1.wav",
                "speakerCue": "Stage 2 · Bilingual OCR & Spell Repair",
                "display": "When a PDF is uploaded, PyMuPDF and Tesseract extract bilingual text, followed by automated spell repair to clean up scanned imperfections.",
            },
            {
                "raw_file": "methodology_2.wav",
                "speakerCue": "Stage 2 · Wet Signature Privacy Isolation",
                "display": "Simultaneously, a signature isolation module detects attestation blocks, cataloging signatory names for administrators while withholding raw signatures from public results.",
            },
            {
                "raw_file": "methodology_3.wav",
                "speakerCue": "Stage 3 · Section Slicing & 384-d Embeddings",
                "display": "A structural parser then segments the text into clean sections, generating 384-dimensional embeddings with BGE-small and indexing them in Convex and SQLite FTS5.",
            },
            {
                "raw_file": "methodology_4.wav",
                "speakerCue": "Stage 4 · 4 Retrieval Modes & Reranking",
                "display": "Queries can run across four modes: Keyword, Vector, Hybrid, or our default Hybrid plus Rerank—which boosts exact legal phrases and bilingual terminology.",
            },
            {
                "raw_file": "methodology_5.wav",
                "speakerCue": "Stage 5 · Lightweight CPU-Powered Architecture",
                "display": "Connecting our Next.js frontend and Python FastAPI backend, this architecture runs entirely on standard CPU hardware without costly infrastructure.",
            },
        ],
    },
    "WALKTHROUGH": {
        "file_key": "walkthrough",
        "target_sec": 106,
        "ticks": [
            {
                "raw_file": "walkthrough_0.wav",
                "speakerCue": "Public Search Portal & Community Inquiries",
                "display": "Here is the live portal. The landing screen showcases the town's seal, live repository metrics, and suggested citizen inquiries.",
            },
            {
                "raw_file": "walkthrough_1.wav",
                "speakerCue": "Submitting a Real Municipal Inquiry",
                "display": "Let's submit our question: 'Who is authorized to borrow funds for the sanitary landfill?' with Hybrid plus Rerank enabled, and click Search.",
            },
            {
                "raw_file": "walkthrough_2.wav",
                "speakerCue": "Instant Grounded Legal Synthesis",
                "display": "In milliseconds, the system produces a source-grounded legal synthesis, confirming Mayor Raymond Adrian Salceda's authority under Ordinance 046.",
            },
            {
                "raw_file": "walkthrough_3.wav",
                "speakerCue": "Interactive Parsed Section Inspector",
                "display": "Selecting Citation One opens the Section Inspector sheet, revealing the verbatim statutory wording of Section Two, its page number, and similarity scores.",
            },
            {
                "raw_file": "walkthrough_4.wav",
                "speakerCue": "Browsing the Complete Document Repository",
                "display": "In the Document Repository, users can browse the complete legislative catalog, from the Land Bank loan to maternal health and waterworks policies.",
            },
            {
                "raw_file": "walkthrough_5.wav",
                "speakerCue": "Administrative Control & Document Intake",
                "display": "Switching to the Admin Portal, staff manage active ordinances, review OCR accuracy, verify extracted signatories, and inspect indexed chunks.",
            },
            {
                "raw_file": "walkthrough_6.wav",
                "speakerCue": "One-Click 4-Mode Benchmark Evaluation",
                "display": "And under Retrieval Evaluation, administrators run comparative experiments across all four search modes with a single click.",
            },
            {
                "raw_file": "walkthrough_7.wav",
                "speakerCue": "Bilingual Natural Language Resilience",
                "display": "The system seamlessly understands bilingual inquiries, whether phrased in English, conversational Tagalog, or local phrasing, reliably retrieving the governing legal provisions.",
            },
            {
                "raw_file": "walkthrough_8.wav",
                "speakerCue": "Strict Extractive Traceability",
                "display": "Every returned insight is strictly extractive and fully traceable back to its enacted source, preventing hallucinations and preserving institutional legal authority.",
            },
        ],
    },
    "EVALUATION": {
        "file_key": "evaluation",
        "target_sec": 82,
        "ticks": [
            {
                "raw_file": "evaluation_new_dual.wav",
                "speakerCue": "Dual Evaluation Methodology",
                "display": "To evaluate our system, Chapter Three establishes a dual framework uniting quantitative IR accuracy with ISO twenty-five zero ten software quality.",
            },
            {
                "raw_file": "evaluation_new_matrix.wav",
                "speakerCue": "4-Point Relevance Judgment Matrix",
                "display": "We adapted the IR confusion matrix into a four-point Relevance Judgment Matrix, grading provisions from three for completely relevant down to zero for non-relevant.",
            },
            {
                "raw_file": "evaluation_new_f1.wav",
                "speakerCue": "Precision, Recall & Balanced F1-Score",
                "display": "From these judgments, we compute Precision, Recall, and the balanced harmonic mean F1-Score, accounting for imbalanced statutory collections.",
            },
            {
                "raw_file": "evaluation_1.wav",
                "speakerCue": "Side-by-Side 4-Mode Ablation Testing",
                "display": "By evaluating Keyword, Dense Vector, Hybrid, and Hybrid plus Rerank side-by-side, we directly measured the impact of semantic indexing and lexical re-ranking.",
            },
            {
                "raw_file": "evaluation_2.wav",
                "speakerCue": "IR Accuracy Metrics & Sub-200ms Latency",
                "display": "The runner records Precision, Recall, Mean Reciprocal Rank, nDCG, citation correctness, and sub-200 millisecond response times.",
            },
            {
                "raw_file": "evaluation_3.wav",
                "speakerCue": "ISO/IEC 25010 Software Quality Survey",
                "display": "Finally, our built-in Quality Survey collects structured evaluations across all eight ISO twenty-five zero ten software dimensions, including usability and security.",
            },
            {
                "raw_file": "evaluation_new_likert.wav",
                "speakerCue": "Weighted Mean Formula & Excellent Ratings",
                "display": "Applying the statistical Weighted Mean formula, the system achieved overall ratings in the Excellent bracket between 4.21 and 5.00, confirming strong institutional acceptance.",
            },
        ],
    },
    "CONCLUSION": {
        "file_key": "conclusion",
        "target_sec": 38,
        "ticks": [
            {
                "raw_file": "conclusion_0.wav",
                "speakerCue": "Empowering Municipal Governance",
                "display": "OrdiSearch transforms static paper ordinances into an accessible, intelligent legal resource that empowers local officials and citizens alike.",
            },
            {
                "raw_file": "conclusion_1.wav",
                "speakerCue": "Thank You from the Research Team",
                "display": "From Kirby Cope, Arnel Hapin, and James Nebria of Bicol University—thank you for watching.",
            },
        ],
    },
}

def read_and_trim_wav(wav_path: str, threshold: int = 180) -> np.ndarray:
    with wave.open(wav_path, "rb") as w:
        n_channels = w.getnchannels()
        frames = w.readframes(w.getnframes())
    samples = np.frombuffer(frames, dtype=np.int16)
    if n_channels == 2:
        samples = samples[::2]

    non_silent = np.where(np.abs(samples) > threshold)[0]
    if len(non_silent) == 0:
        return samples

    pad = int(0.06 * SAMPLE_RATE)  # 60ms natural pad
    start_idx = max(0, int(non_silent[0]) - pad)
    end_idx = min(len(samples), int(non_silent[-1]) + pad)
    trimmed = samples[start_idx:end_idx].copy()

    fade_n = min(int(0.015 * SAMPLE_RATE), len(trimmed) // 4)
    if fade_n > 0:
        trimmed[:fade_n] = (trimmed[:fade_n].astype(np.float32) * np.linspace(0, 1, fade_n)).astype(np.int16)
        trimmed[-fade_n:] = (trimmed[-fade_n:].astype(np.float32) * np.linspace(1, 0, fade_n)).astype(np.int16)

    return trimmed

def build_scene(scene_key: str, cfg: dict):
    file_key = cfg["file_key"]
    target_sec = cfg["target_sec"]
    breath_samples = np.zeros(int(0.28 * SAMPLE_RATE), dtype=np.int16)
    lead_in_samples = np.zeros(int(0.12 * SAMPLE_RATE), dtype=np.int16)

    chunks = [lead_in_samples]
    cur_sample = len(lead_in_samples)
    timed_ticks = []

    for i, t in enumerate(cfg["ticks"]):
        wav_path = os.path.join(RAW_DIR, t["raw_file"])
        if not os.path.exists(wav_path):
            raise FileNotFoundError(f"Missing raw audio: {wav_path}")
        trimmed = read_and_trim_wav(wav_path)
        start_sec = round(cur_sample / SAMPLE_RATE, 2)
        chunks.append(trimmed)
        cur_sample += len(trimmed)

        chunks.append(breath_samples)
        cur_sample += len(breath_samples)
        end_sec = round(cur_sample / SAMPLE_RATE, 2)

        timed_ticks.append({
            "startSec": start_sec,
            "endSec": end_sec,
            "speakerCue": t["speakerCue"],
            "text": t["display"],
        })

    exact_spoken_sec = cur_sample / SAMPLE_RATE
    final_dur_sec = max(target_sec, int(math.ceil(exact_spoken_sec + 0.2)))
    tail_needed = int(final_dur_sec * SAMPLE_RATE) - cur_sample
    if tail_needed > 0:
        chunks.append(np.zeros(tail_needed, dtype=np.int16))

    timed_ticks[-1]["endSec"] = final_dur_sec

    master_track = np.concatenate(chunks)
    out_wav = os.path.join(AUDIO_DIR, f"vo_{file_key}.wav")
    with wave.open(out_wav, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SAMPLE_RATE)
        w.writeframes(master_track.tobytes())

    print(f"  [Stitched] vo_{file_key}.wav -> {final_dur_sec}s (spoken: {exact_spoken_sec:.2f}s, target: {target_sec}s)")
    return {
        "durationSec": final_dur_sec,
        "ticks": timed_ticks,
    }

def update_constants_ts(results: dict):
    scenes_lines = []
    cur_start = 0
    for sk, data in results.items():
        dur = data["durationSec"]
        scenes_lines.append(
            f"  {sk}: {{ start: {cur_start}, duration: {dur}, durationSec: {dur}, frames: {dur} * FPS }},"
        )
        cur_start += dur

    ticks_blocks = []
    for sk, data in results.items():
        t_lines = [f"  {sk}: ["]
        for t in data["ticks"]:
            t_lines.append("    {")
            t_lines.append(f"      startSec: {t['startSec']},")
            t_lines.append(f"      endSec: {t['endSec']},")
            t_lines.append(f"      speakerCue: {json.dumps(t['speakerCue'])},")
            t_lines.append(f"      text: {json.dumps(t['text'])},")
            t_lines.append("    },")
        t_lines.append("  ],")
        ticks_blocks.append("\n".join(t_lines))

    ts_content = f"""export const THEME = {{
  // Exact Light Mode Palette from frontend/app/globals.css & tailwind.config.ts
  bg: "#f8fafc",
  paper: "#ffffff",
  surface: "#ffffff",
  secondaryBg: "#f1f5f9",
  surfaceMuted: "#f1f5f9",
  border: "#e2e8f0",
  borderStrong: "#cbd5e1",

  // Civic Greens
  civic50: "#eaf5ee",
  civic100: "#cde9d5",
  civic200: "#9fd3af",
  civic300: "#6ec089",
  civic400: "#3da663",
  civic500: "#1e824c",
  civic600: "#14683a",
  civic700: "#0f512c",
  civic800: "#0b3d20",
  civic900: "#072a16",
  civic950: "#03170c",

  // Ink / Typography
  ink950: "#020617",
  ink900: "#0f172a",
  ink800: "#1e293b",
  ink700: "#334155",
  ink600: "#475569",
  ink500: "#64748b",
  ink400: "#94a3b8",
  ink300: "#cbd5e1",

  // Accents
  gold50: "#fffbeb",
  gold100: "#fef3c7",
  gold500: "#d97706",
  gold700: "#b45309",
  amber100: "#fef3c7",
  amber600: "#d97706",
  rust50: "#fef2f2",
  rust100: "#fee2e2",
  rust600: "#dc2626",
  rust700: "#b91c1c",
  red100: "#fee2e2",
  red500: "#dc2626",
  emerald50: "#ecfdf5",
  emerald100: "#d1fae5",
  emerald500: "#10b981",
  emerald700: "#047857",
  blue50: "#eff6ff",
  blue100: "#dbeafe",
  blue600: "#2563eb",
  blue700: "#1d4ed8",

  // Fonts
  fontSans: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif",
  fontSerif: "Newsreader, Georgia, Cambria, 'Times New Roman', serif",
  fontMono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
}};

export const FPS = 30;
export const VIDEO_FPS = 30;

export type ScriptTick = {{
  startSec: number;
  endSec: number;
  speakerCue: string;
  text: string;
}};

// Exactly 10-Minute Presentation Video (Total: {cur_start}s = {cur_start // 60}m {cur_start % 60:02d}s, {cur_start * 30} frames @ 30 FPS)
export const SCENES = {{
{chr(10).join(scenes_lines)}
}};

export const TOTAL_DURATION_FRAMES = Object.values(SCENES).reduce(
  (acc, s) => acc + s.frames,
  0
);

export const RESEARCHERS = [
  {{
    name: "Kirby Cope",
    role: "Researcher",
    affiliation: "Bicol University Polangui",
    photo: "media_1793593901975.jpg",
  }},
  {{
    name: "Arnel Hapin",
    role: "Researcher",
    affiliation: "Bicol University Polangui",
    photo: "media_1793593901974.jpg",
  }},
  {{
    name: "James Nebria",
    role: "Researcher",
    affiliation: "Bicol University Polangui",
    photo: "media_1793593906359.jpg",
  }},
];

export const TELEPROMPTER_TICKS: Record<keyof typeof SCENES, ScriptTick[]> = {{
{(chr(10) + chr(10)).join(ticks_blocks)}
}};
"""
    with open(CONSTANTS_PATH, "w", encoding="utf-8") as f:
        f.write(ts_content)
    print(f"\n[Updated Constants] {CONSTANTS_PATH} (Total video duration: {cur_start}s = {cur_start//60}m {cur_start%60}s, {cur_start*30} frames)")

if __name__ == "__main__":
    print("=== Building 10-Minute Master Video Audio Tracks & Synchronized Timings ===")
    results = {}
    total_sec = 0
    for sk, cfg in SCENE_CONFIGS.items():
        results[sk] = build_scene(sk, cfg)
        total_sec += results[sk]["durationSec"]
    
    print(f"\nTotal video duration: {total_sec}s (Target: 600s)")
    update_constants_ts(results)
    print("=== Master 10-Minute Audio Build Complete! ===")
