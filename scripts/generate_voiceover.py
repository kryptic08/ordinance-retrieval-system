import os
import sys
import json
import time
import math
import wave
import sqlite3
import urllib.request
import numpy as np

OMNIVOICE_URL = os.environ.get("OMNIVOICE_URL", "http://127.0.0.1:3900")
PROFILE_ID = os.environ.get("PROFILE_ID", "be77634a")  # User's updated "Me" cloned voice
SAMPLE_RATE = 24000

# ==============================================================================
# PRONUNCIATION DICTIONARY (Master Instructions Section 4)
# Preserves proper written spelling in on-screen subtitles & UI while guiding
# the TTS engine with phonetic respellings for technical & local Bicol terms.
# ==============================================================================
PRONUNCIATION_DICTIONARY = [
    # System & Local Proper Names
    ("OrdiSearch", "Or-dee Search", "Brand name: pronounced as two distinct words, Or-dee Search"),
    ("Polangui", "pulang-geee", "Municipality in Albay: pronounced pulang-geee"),
    ("Albay", "Al-bay", "Province in Bicol region"),
    ("Bicol", "Bee-col", "Region and university name: long E sound"),
    ("Sangguniang Bayan", "Sang-goo-nee-ang Ba-yan", "Municipal legislative council"),
    ("Salceda", "Sal-seh-da", "Municipal Mayor surname"),
    ("Hapín / Hapin", "Ha-pin", "Researcher surname"),
    ("Nebria", "Neb-ree-ya", "Researcher surname"),
    ("Rinconada", "Rin-co-na-da", "District in Albay"),
    ("Barangay", "Ba-rang-gay", "Local administrative division"),
    ("Barangays", "Ba-rang-gays", "Plural of Barangay"),
    ("RRBWASA", "R-R-B-W-A-S-A", "Acronym spoken letter-by-letter"),
    ("LGU", "L-G-U", "Local Government Unit acronym spoken letter-by-letter"),
    # Technical Terms & Acronyms
    ("PDF", "P-D-F", "Acronym spoken as individual letters"),
    ("PDFs", "P-D-Fs", "Plural acronym"),
    ("OCR", "O-C-R", "Optical Character Recognition spoken letter-by-letter"),
    ("PyMuPDF", "Pie-Mew P-D-F", "Python PDF extraction library"),
    ("Tesseract", "Tess-er-act", "OCR engine"),
    ("FastEmbed", "Fast Embed", "Two distinct words"),
    ("BAAI/bge-small-en-v1.5", "B-G-E Small", "Concise spoken model name"),
    ("BGE-small", "B-G-E Small", "Spoken letters B-G-E followed by Small"),
    ("384-d", "three hundred eighty-four dimensional", "Full spoken dimension count"),
    ("Convex", "Con-vex", "Reactive database platform"),
    ("SQLite FTS5", "S-Q-Lite F-T-S five", "Full-text search extension"),
    ("BM25", "B-M twenty-five", "Best Matching 25 ranking function"),
    ("FastAPI", "Fast A-P-I", "Python web framework"),
    ("Next.js 15", "Next J-S fifteen", "Frontend React framework"),
    ("CPU", "C-P-U", "Spoken as individual letters"),
    ("Precision@K", "Precision at K", "IR metric"),
    ("Recall@K", "Recall at K", "IR metric"),
    ("MRR", "M-R-R", "Mean Reciprocal Rank spoken as letters"),
    ("nDCG@K", "N-D-C-G at K", "Normalized Discounted Cumulative Gain"),
    ("nDCG", "N-D-C-G", "Normalized Discounted Cumulative Gain"),
    ("ISO/IEC 25010", "I-S-O, I-E-C, twenty-five zero ten", "International software quality standard"),
    ("ISO", "I-S-O", "International Organization for Standardization"),
]


def ensure_pronunciation_rules():
    db_path = os.path.expanduser(r"~\AppData\Roaming\OmniVoice\omnivoice.db")
    if not os.path.exists(db_path):
        return
    try:
        conn = sqlite3.connect(db_path)
        c = conn.cursor()
        c.execute("DELETE FROM pronunciation_entries WHERE term = 'Cope'")
        now = time.time()
        for term, rep, _note in PRONUNCIATION_DICTIONARY:
            c.execute("DELETE FROM pronunciation_entries WHERE term = ?", (term,))
            entry_id = f"rule_{abs(hash(term))}"
            c.execute(
                "INSERT INTO pronunciation_entries (id, term, replacement, type, language, enabled, created_at) VALUES (?, ?, ?, 'respelling', '*', 1, ?)",
                (entry_id, term, rep, now),
            )
        conn.commit()
        conn.close()
        print(f"  [Pronunciation Dictionary] Synced {len(PRONUNCIATION_DICTIONARY)} phonetic entries in omnivoice.db")
    except Exception as e:
        print("  [Pronunciation Dictionary] Note:", e)


# ==============================================================================
# MASTER PRESENTATION SPIEL (35 Cohesive Ticks across 7 Scenes)
# - `display`: Clean, properly spelled text for on-screen subtitles (`constants.ts`)
# - `tts`: Phonetically guided text for OmniVoice TTS input layer
# ==============================================================================
MASTER_SPIEL = {
    "INTRO": {
        "file_key": "intro",
        "ticks": [
            {
                "speakerCue": "Enacted Municipal Ordinances",
                "display": "In local governance, every enacted municipal ordinance shapes infrastructure, public health, and daily community life.",
                "tts": "In local governance, every enacted municipal ordinance shapes infrastructure, public health, and daily community life.",
            },
            {
                "speakerCue": "The Challenge of Static Scanned Binders",
                "display": "Yet once approved, these crucial policies often sit locked away inside multi-page scanned PDF binders—making them difficult to navigate and slow to verify.",
                "tts": "Yet once approved, these crucial policies often sit locked away inside multi-page scanned P-D-F binders, making them difficult to navigate and slow to verify.",
            },
            {
                "speakerCue": "Introducing OrdiSearch",
                "display": "To solve this, we created OrdiSearch: an intelligent vector retrieval system developed in partnership with the Municipality of Polangui.",
                "tts": "To solve this, we created Or-dee Search: an intelligent vector retrieval system developed in partnership with the Municipality of pulang-geee.",
            },
            {
                "speakerCue": "Research Team · Bicol University",
                "display": "We are researchers from Bicol University. I'm Kirby Cope, alongside Arnel Hapin...",
                "tts": "We are researchers from Bee-col University. I'm Kirby Ko-peh, alongside Arnel Ha-pin...",
            },
            {
                "speakerCue": "Modernizing Legal Access",
                "display": "...and James Nebria, working together with local leaders to give citizens and municipal staff instant, citation-grounded access to the law.",
                "tts": "and James Neb-ree-ya, working together with local leaders to give citizens and municipal staff instant, citation-grounded access to the law.",
            },
        ],
    },
    "PROBLEM": {
        "file_key": "problem",
        "ticks": [
            {
                "speakerCue": "Real Local Ordinance Corpus",
                "display": "Take our actual local corpus—such as Ordinance 046 on municipal borrowing, 11-062 on maternal nutrition, and 11-063 on barangay waterworks.",
                "tts": "Take our actual local corpus, such as Ordinance zero forty-six on municipal borrowing, eleven zero sixty-two on maternal nutrition, and eleven zero sixty-three on ba-rang-gay waterworks.",
            },
            {
                "speakerCue": "Bilingual Scanned Documents",
                "display": "These records span dozens of scanned pages blending English and Filipino statutory terms, tables, and formal preambles.",
                "tts": "These records span dozens of scanned pages blending English and Filipino statutory terms, tables, and formal preambles.",
            },
            {
                "speakerCue": "Everyday Questions vs. Legal Terminology",
                "display": "When a resident or official asks a straightforward question—like 'Who is authorized to borrow funds for the sanitary landfill?'—they speak in everyday conversational language.",
                "tts": "When a resident or official asks a straightforward question, like 'Who is authorized to borrow funds for the sanitary landfill?', they speak in everyday conversational language.",
            },
            {
                "speakerCue": "Why Traditional Keyword Search Fails",
                "display": "Inside the actual document, the text speaks formally of entering an 'Omnibus Term Agreement with Land Bank.' Because the words don't match literally, standard keyword search fails completely.",
                "tts": "Inside the actual document, the text speaks formally of entering an Omnibus Term Agreement with Land Bank. Because the words don't match literally, standard keyword search fails completely.",
            },
            {
                "speakerCue": "Bridging the Semantic Gap with Dense Vectors",
                "display": "OrdiSearch bridges this semantic gap using dense vectors—mapping the true intent of your question directly to the authoritative enacted provision.",
                "tts": "Or-dee Search bridges this semantic gap using dense vectors, mapping the true intent of your question directly to the authoritative enacted provision.",
            },
        ],
    },
    "SIGNIFICANCE_OBJECTIVES": {
        "file_key": "significance",
        "ticks": [
            {
                "speakerCue": "Sub-Second Verified Statutory Lookup",
                "display": "Why is this a game changer? For local administration, it turns hours of digging through paper archives into sub-second, verified statutory lookup.",
                "tts": "Why is this a game changer? For local administration, it turns hours of digging through paper archives into sub-second, verified statutory lookup.",
            },
            {
                "speakerCue": "Preventing Policy Conflicts and Duplication",
                "display": "For municipal lawmakers, it offers instant cross-referencing to check existing policies and prevent overlapping regulations before drafting new measures.",
                "tts": "For municipal lawmakers, it offers instant cross-referencing to check existing policies and prevent overlapping regulations before drafting new measures.",
            },
            {
                "speakerCue": "Citizen Access with Privacy Protection",
                "display": "And for the public, it provides transparent access while strictly isolating physical wet signatures and raw files to safeguard official privacy.",
                "tts": "And for the public, it provides transparent access while strictly isolating physical wet signatures and raw files to safeguard official privacy.",
            },
            {
                "speakerCue": "Objective 1 · Legislative Corpus & Metadata",
                "display": "Our first objective established this legislative corpus, formalizing a structured metadata schema and a benchmark query collection.",
                "tts": "Our first objective established this legislative corpus, formalizing a structured metadata schema and a benchmark query collection.",
            },
            {
                "speakerCue": "Objective 2 · Bilingual OCR & Semantic Pipeline",
                "display": "Our second objective engineered the retrieval pipeline—pairing bilingual OCR repair and section slicing with FastEmbed vectors and reactive synchronization.",
                "tts": "Our second objective engineered the retrieval pipeline, pairing bilingual O-C-R repair and section slicing with Fast Embed vectors and reactive synchronization.",
            },
            {
                "speakerCue": "Objective 3 · IR Benchmark & ISO 25010 Quality",
                "display": "And our third objective evaluated retrieval accuracy and system quality across four distinct search configurations using the ISO twenty-five zero ten standard.",
                "tts": "And our third objective evaluated retrieval accuracy and system quality across four distinct search configurations using the I-S-O twenty-five zero ten standard.",
            },
        ],
    },
    "METHODOLOGY": {
        "file_key": "methodology",
        "ticks": [
            {
                "speakerCue": "Tailored Municipal Processing Architecture",
                "display": "We followed Rapid Application Development, architecting an end-to-end processing pipeline tailored to Philippine local legislation.",
                "tts": "We followed Rapid Application Development, architecting an end-to-end processing pipeline tailored to Philippine local legislation.",
            },
            {
                "speakerCue": "Stage 1 · Bilingual OCR & Spell Repair",
                "display": "When a PDF is uploaded, PyMuPDF and Tesseract extract bilingual text, followed by automated spell repair to clean up scanned imperfections.",
                "tts": "When a P-D-F is uploaded, Pie-Mew P-D-F and Tess-er-act extract bilingual text, followed by automated spell repair to clean up scanned imperfections.",
            },
            {
                "speakerCue": "Stage 1 · Wet Signature Privacy Isolation",
                "display": "Simultaneously, a signature isolation module detects attestation blocks, cataloging signatory names for administrators while withholding raw signatures from public results.",
                "tts": "Simultaneously, a signature isolation module detects attestation blocks, cataloging signatory names for administrators while withholding raw signatures from public results.",
            },
            {
                "speakerCue": "Stage 2 · Section Slicing & 384-d Embeddings",
                "display": "A structural parser then segments the text into clean sections, generating 384-dimensional embeddings with BGE-small and indexing them in Convex and SQLite FTS5.",
                "tts": "A structural parser then segments the text into clean sections, generating three hundred eighty-four dimensional embeddings with B-G-E Small and indexing them in Con-vex and S-Q-Lite F-T-S five.",
            },
            {
                "speakerCue": "Stage 3 · 4 Retrieval Modes & Reranking",
                "display": "Queries can run across four modes: Keyword, Vector, Hybrid, or our default Hybrid plus Rerank—which boosts exact legal phrases and bilingual terminology.",
                "tts": "Queries can run across four modes: Keyword, Vector, Hybrid, or our default Hybrid plus Rerank, which boosts exact legal phrases and bilingual terminology.",
            },
            {
                "speakerCue": "Stage 4 · Lightweight CPU-Powered Architecture",
                "display": "Connecting our Next.js frontend and Python FastAPI backend, this architecture runs entirely on standard CPU hardware without costly infrastructure.",
                "tts": "Connecting our Next J-S frontend and Python Fast A-P-I backend, this architecture runs entirely on standard C-P-U hardware without costly infrastructure.",
            },
        ],
    },
    "WALKTHROUGH": {
        "file_key": "walkthrough",
        "ticks": [
            {
                "speakerCue": "Public Search Portal & Community Inquiries",
                "display": "Here is the live portal. The landing screen showcases the town's seal, live repository metrics, and suggested citizen inquiries.",
                "tts": "Here is the live portal. The landing screen showcases the town's seal, live repository metrics, and suggested citizen inquiries.",
            },
            {
                "speakerCue": "Submitting a Real Municipal Inquiry",
                "display": "Let's submit our question: 'Who is authorized to borrow funds for the sanitary landfill?' with Hybrid plus Rerank enabled, and click Search.",
                "tts": "Let's submit our question: 'Who is authorized to borrow funds for the sanitary landfill?' with Hybrid plus Rerank enabled, and click Search.",
            },
            {
                "speakerCue": "Instant Grounded Legal Synthesis",
                "display": "In milliseconds, the system produces a source-grounded legal synthesis, confirming Mayor Raymond Adrian Salceda's authority under Ordinance 046.",
                "tts": "In milliseconds, the system produces a source-grounded legal synthesis, confirming Mayor Raymond Adrian Sal-seh-da's authority under Ordinance zero forty-six.",
            },
            {
                "speakerCue": "Interactive Parsed Section Inspector",
                "display": "Selecting Citation One opens the Section Inspector sheet, revealing the verbatim statutory wording of Section Two, its page number, and similarity scores.",
                "tts": "Selecting Citation One opens the Section Inspector sheet, revealing the verbatim statutory wording of Section Two, its page number, and similarity scores.",
            },
            {
                "speakerCue": "Browsing the Complete Document Repository",
                "display": "In the Document Repository, users can browse the complete legislative catalog, from the Land Bank loan to maternal health and waterworks policies.",
                "tts": "In the Document Repository, users can browse the complete legislative catalog, from the Land Bank loan to maternal health and waterworks policies.",
            },
            {
                "speakerCue": "Administrative Control & Document Intake",
                "display": "Switching to the Admin Portal, staff manage active ordinances, review OCR accuracy, verify extracted signatories, and inspect indexed chunks.",
                "tts": "Switching to the Administrative Portal, staff manage active ordinances, review O-C-R accuracy, verify extracted signatories, and inspect indexed chunks.",
            },
            {
                "speakerCue": "One-Click 4-Mode Benchmark Evaluation",
                "display": "And under Retrieval Evaluation, administrators run comparative experiments across all four search modes with a single click.",
                "tts": "And under Retrieval Evaluation, administrators run comparative experiments across all four search modes with a single click.",
            },
        ],
    },
    "EVALUATION": {
        "file_key": "evaluation",
        "ticks": [
            {
                "speakerCue": "Rigorous Ground-Truth Benchmark Framework",
                "display": "To rigorously evaluate performance, we designed a benchmark framework using human-judged test queries mapped to verified ordinance sections.",
                "tts": "To rigorously evaluate performance, we designed a benchmark framework using human-judged test queries mapped to verified ordinance sections.",
            },
            {
                "speakerCue": "Side-by-Side 4-Mode Ablation Testing",
                "display": "By evaluating Keyword, Dense Vector, Hybrid, and Hybrid plus Rerank side-by-side, we directly measured the impact of semantic indexing and lexical re-ranking.",
                "tts": "By evaluating Keyword, Dense Vector, Hybrid, and Hybrid plus Rerank side-by-side, we directly measured the impact of semantic indexing and lexical re-ranking.",
            },
            {
                "speakerCue": "IR Accuracy Metrics & Sub-200ms Latency",
                "display": "The runner records Precision, Recall, Mean Reciprocal Rank, nDCG, citation correctness, and sub-200 millisecond response times.",
                "tts": "The runner records Precision, Recall, Mean Reciprocal Rank, N-D-C-G, citation correctness, and sub-two hundred millisecond response times.",
            },
            {
                "speakerCue": "ISO/IEC 25010 Software Quality Survey",
                "display": "Finally, our built-in Quality Survey collects structured evaluations across all eight ISO twenty-five zero ten software dimensions, including usability and security.",
                "tts": "Finally, our built-in Quality Survey collects structured evaluations across all eight I-S-O twenty-five zero ten software dimensions, including usability and security.",
            },
        ],
    },
    "CONCLUSION": {
        "file_key": "conclusion",
        "ticks": [
            {
                "speakerCue": "Empowering Municipal Governance",
                "display": "OrdiSearch transforms static paper ordinances into an accessible, intelligent legal resource that empowers local officials and citizens alike.",
                "tts": "Or-dee Search transforms static paper ordinances into an accessible, intelligent legal resource that empowers local officials and citizens alike.",
            },
            {
                "speakerCue": "Thank You from the Research Team",
                "display": "From Kirby Cope, Arnel Hapin, and James Nebria of Bicol University—thank you for watching.",
                "tts": "From Kirby Ko-peh, Arnel Ha-pin, and James Neb-ree-ya of Bee-col University, thank you for watching.",
            },
        ],
    },
}

OUT_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "remotion-video", "public", "voiceover")
)
RAW_DIR = os.path.join(OUT_DIR, "raw")
os.makedirs(RAW_DIR, exist_ok=True)


def estimate_natural_duration(tts_text: str) -> float:
    """
    Computes a comfortable, confident conversational duration (~2.45 words/sec)
    so OmniVoice speaks naturally without rushing or dragging.
    """
    words = len(tts_text.replace("-", " ").split())
    est = words / 2.45 + 0.6
    return round(max(7.2, min(11.5, est)), 2)


def read_and_trim_wav(wav_path: str, threshold: int = 180) -> np.ndarray:
    """
    Reads a WAV file and trims any leading or trailing dead silence above 80ms,
    ensuring zero dead air between sentences.
    """
    with wave.open(wav_path, "rb") as w:
        n_channels = w.getnchannels()
        frames = w.readframes(w.getnframes())
    samples = np.frombuffer(frames, dtype=np.int16)
    if n_channels == 2:
        samples = samples[::2]

    non_silent = np.where(np.abs(samples) > threshold)[0]
    if len(non_silent) == 0:
        return samples

    pad = int(0.06 * SAMPLE_RATE)  # 60ms natural attack/decay pad
    start_idx = max(0, int(non_silent[0]) - pad)
    end_idx = min(len(samples), int(non_silent[-1]) + pad)
    trimmed = samples[start_idx:end_idx].copy()

    # Apply tiny 15ms de-click fade at start and end
    fade_n = min(int(0.015 * SAMPLE_RATE), len(trimmed) // 4)
    if fade_n > 0:
        trimmed[:fade_n] = (trimmed[:fade_n].astype(np.float32) * np.linspace(0, 1, fade_n)).astype(np.int16)
        trimmed[-fade_n:] = (trimmed[-fade_n:].astype(np.float32) * np.linspace(1, 0, fade_n)).astype(np.int16)

    return trimmed


def generate_tick_audio(tts_text: str, out_path: str, force: bool = True):
    if os.path.exists(out_path) and not force:
        print(f"  [Cached] {os.path.basename(out_path)}")
        return

    payload = {
        "model": "omnivoice",
        "input": tts_text,
        "voice": PROFILE_ID,
        "response_format": "wav",
        "speed": 1.03,
        "num_step": 16,
    }

    req = urllib.request.Request(
        f"{OMNIVOICE_URL}/v1/audio/speech",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )

    t0 = time.time()
    with urllib.request.urlopen(req, timeout=180) as resp:
        audio_data = resp.read()
    elapsed = time.time() - t0

    with open(out_path, "wb") as f:
        f.write(audio_data)

    print(
        f"  [Generated] {os.path.basename(out_path)} ({len(audio_data)} bytes in {elapsed:.1f}s)"
    )


def build_scene_audio_and_timings(scene_key: str, scene_cfg: dict) -> dict:
    """
    Packs all trimmed tick WAVs back-to-back with a 0.28s conversational breath pause,
    eliminating 100% of dead air, and returns the exact startSec/endSec for each tick.
    """
    file_key = scene_cfg["file_key"]
    breath_samples = np.zeros(int(0.28 * SAMPLE_RATE), dtype=np.int16)
    lead_in_samples = np.zeros(int(0.12 * SAMPLE_RATE), dtype=np.int16)

    chunks = [lead_in_samples]
    cur_sample = len(lead_in_samples)
    timed_ticks = []

    for i, tick in enumerate(scene_cfg["ticks"]):
        raw_wav_path = os.path.join(RAW_DIR, f"{file_key}_{i}.wav")
        trimmed = read_and_trim_wav(raw_wav_path)

        tick_start_sec = round(cur_sample / SAMPLE_RATE, 2)
        chunks.append(trimmed)
        cur_sample += len(trimmed)

        # Add natural breath pause after each tick
        chunks.append(breath_samples)
        cur_sample += len(breath_samples)
        tick_end_sec = round(cur_sample / SAMPLE_RATE, 2)

        timed_ticks.append(
            {
                "startSec": tick_start_sec,
                "endSec": tick_end_sec,
                "speakerCue": tick["speakerCue"],
                "text": tick["display"],
            }
        )

    # Round scene duration up to next integer second (at least +0.2s tail)
    exact_sec = cur_sample / SAMPLE_RATE
    scene_duration_sec = int(math.ceil(exact_sec + 0.15))
    tail_needed = max(0, int(scene_duration_sec * SAMPLE_RATE) - cur_sample)
    if tail_needed > 0:
        chunks.append(np.zeros(tail_needed, dtype=np.int16))

    # Extend last tick endSec to scene_duration_sec so caption stays visible
    timed_ticks[-1]["endSec"] = scene_duration_sec

    master_track = np.concatenate(chunks)
    out_scene_wav = os.path.join(OUT_DIR, f"vo_{file_key}.wav")
    with wave.open(out_scene_wav, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SAMPLE_RATE)
        w.writeframes(master_track.tobytes())

    print(
        f"[Scene Stitched] vo_{file_key}.wav -> {scene_duration_sec}s (spoken: {exact_sec:.2f}s, zero dead air)"
    )
    return {
        "durationSec": scene_duration_sec,
        "ticks": timed_ticks,
    }


def write_synchronized_constants_ts(scene_results: dict):
    """
    Writes `remotion-video/src/constants.ts` with exact audio-synchronized
    SCENES and TELEPROMPTER_TICKS so visuals and captions lock to the voiceover.
    """
    constants_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "remotion-video", "src", "constants.ts")
    )

    scenes_lines = []
    cur_start = 0
    for scene_key, data in scene_results.items():
        dur = data["durationSec"]
        scenes_lines.append(
            f"  {scene_key}: {{ start: {cur_start}, duration: {dur}, durationSec: {dur}, frames: {dur} * FPS }},"
        )
        cur_start += dur

    ticks_blocks = []
    for scene_key, data in scene_results.items():
        t_lines = [f"  {scene_key}: ["]
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

// Audio-Synchronized Scene Durations (Total: {cur_start}s = {cur_start // 60}m {cur_start % 60}s)
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
    with open(constants_path, "w", encoding="utf-8") as f:
        f.write(ts_content)
    print(f"[Synchronized] Updated {constants_path} (Total duration: {cur_start}s = {cur_start/60:.2f} mins)")


def main():
    force = "--cached" not in sys.argv
    ensure_pronunciation_rules()
    print(f"=== Generating Master Pitch Voiceover with Profile: {PROFILE_ID} ('Me') ===")
    print(f"OmniVoice URL: {OMNIVOICE_URL}")

    scene_results = {}
    overall_t0 = time.time()

    for scene_key, scene_cfg in MASTER_SPIEL.items():
        file_key = scene_cfg["file_key"]
        print(f"\n--- Scene {scene_key} ({len(scene_cfg['ticks'])} ticks) ---")
        for i, tick in enumerate(scene_cfg["ticks"]):
            out_file = os.path.join(RAW_DIR, f"{file_key}_{i}.wav")
            generate_tick_audio(tick["tts"], out_file, force=force)
        scene_results[scene_key] = build_scene_audio_and_timings(scene_key, scene_cfg)

    write_synchronized_constants_ts(scene_results)
    total_elapsed = time.time() - overall_t0
    print(f"\n=== Master Voiceover & Timing Synchronization Complete in {total_elapsed:.1f}s ===")


if __name__ == "__main__":
    main()
