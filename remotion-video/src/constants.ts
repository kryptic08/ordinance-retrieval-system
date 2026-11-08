export const THEME = {
  // High-Contrast Light Mode Palette for Maximum Visibility from Afar
  bg: "#f8fafc",
  paper: "#ffffff",
  surface: "#ffffff",
  secondaryBg: "#f1f5f9",
  surfaceMuted: "#f1f5f9",
  border: "#cbd5e1",
  borderStrong: "#94a3b8",

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

  // High-Contrast Ink / Typography (Readable from 10+ feet)
  ink950: "#020617",
  ink900: "#0f172a",
  ink800: "#1e293b",
  ink700: "#334155",
  ink600: "#475569",
  ink500: "#64748b",
  ink400: "#94a3b8",
  ink300: "#cbd5e1",

  // Vibrant Accents
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
};

export const FPS = 30;
export const VIDEO_FPS = 30;

export type ScriptTick = {
  startSec: number;
  endSec: number;
  speakerCue: string;
  text: string;
};

// Exactly 10+ Minute Presentation Video (Total: 631s = 10m 31s, 18930 frames @ 30 FPS)
// Order: Intro -> Problem -> Significance/Objectives -> Literature -> Methodology -> Evaluation -> Walkthrough -> Conclusion
export const SCENES = {
  INTRO: { start: 0, duration: 44, durationSec: 44, frames: 44 * FPS },
  PROBLEM: { start: 44, duration: 73, durationSec: 73, frames: 73 * FPS },
  SIGNIFICANCE_OBJECTIVES: { start: 117, duration: 73, durationSec: 73, frames: 73 * FPS },
  LITERATURE_FRAMEWORK: { start: 190, duration: 138, durationSec: 138, frames: 138 * FPS },
  METHODOLOGY: { start: 328, duration: 90, durationSec: 90, frames: 90 * FPS },
  EVALUATION: { start: 418, duration: 91, durationSec: 91, frames: 91 * FPS },
  WALKTHROUGH: { start: 509, duration: 105, durationSec: 105, frames: 105 * FPS },
  CONCLUSION: { start: 614, duration: 17, durationSec: 17, frames: 17 * FPS },
};

export const TOTAL_DURATION_FRAMES = Object.values(SCENES).reduce(
  (acc, s) => acc + s.frames,
  0
);

export const RESEARCHERS = [
  {
    name: "Kirby Cope",
    role: "Researcher",
    affiliation: "Bicol University Polangui",
    photo: "media_1793593901975.jpg",
  },
  {
    name: "Arnel Hapin",
    role: "Researcher",
    affiliation: "Bicol University Polangui",
    photo: "media_1793593901974.jpg",
  },
  {
    name: "James Nebria",
    role: "Researcher",
    affiliation: "Bicol University Polangui",
    photo: "media_1793593906359.jpg",
  },
];

export const TELEPROMPTER_TICKS: Record<keyof typeof SCENES, ScriptTick[]> = {
  INTRO: [
    {
      startSec: 0.1,
      endSec: 8.02,
      speakerCue: "Enacted Municipal Ordinances",
      text: "In local governance, every enacted municipal ordinance shapes infrastructure, public health, and daily community life.",
    },
    {
      startSec: 8.02,
      endSec: 18.37,
      speakerCue: "The Challenge of Static Scanned Binders",
      text: "Yet once approved, these crucial policies often sit locked away inside multi-page scanned PDF binders\u2014making them difficult to navigate and slow to verify.",
    },
    {
      startSec: 18.37,
      endSec: 27.94,
      speakerCue: "Introducing OrdiSearch",
      text: "To solve this, we created OrdiSearch: an intelligent vector retrieval system developed in partnership with the Municipality of Polangui.",
    },
    {
      startSec: 27.94,
      endSec: 33.7,
      speakerCue: "Research Team \u00b7 Bicol University",
      text: "We are researchers from Bicol University. I'm Kirby Cope, alongside Arnel Hapin...",
    },
    {
      startSec: 33.7,
      endSec: 44,
      speakerCue: "Modernizing Legal Access",
      text: "...and James Nebria, working together with local leaders to give citizens and municipal staff instant, citation-grounded access to the law.",
    },
  ],

  PROBLEM: [
    {
      startSec: 0.1,
      endSec: 12.48,
      speakerCue: "Real Local Ordinance Corpus",
      text: "Take our actual local corpus\u2014such as Ordinance 046 on municipal borrowing, 11-062 on maternal nutrition, and 11-063 on barangay waterworks.",
    },
    {
      startSec: 12.48,
      endSec: 20.6,
      speakerCue: "Bilingual Scanned Documents",
      text: "These records span dozens of scanned pages blending English and Filipino statutory terms, tables, and formal preambles.",
    },
    {
      startSec: 20.6,
      endSec: 38.22,
      speakerCue: "Historical Archive Retrieval Delays",
      text: "Before this study, personnel at the Office of the Secretary to the Sangguniang Bayan had to manually inspect extensive physical ordinance files, facing significant delays because keyword searches cannot bridge everyday natural language with legal terminology.",
    },
    {
      startSec: 38.22,
      endSec: 49.54,
      speakerCue: "Everyday Questions vs. Legal Terminology",
      text: "When a resident or official asks a straightforward question\u2014like 'Who is authorized to borrow funds for the sanitary landfill?'\u2014they speak in everyday conversational language.",
    },
    {
      startSec: 49.54,
      endSec: 62.07,
      speakerCue: "Why Traditional Keyword Search Fails",
      text: "Inside the actual document, the text speaks formally of entering an 'Omnibus Term Agreement with Land Bank.' Because the words don't match literally, standard keyword search fails completely.",
    },
    {
      startSec: 62.07,
      endSec: 73,
      speakerCue: "Bridging the Semantic Gap with Dense Vectors",
      text: "OrdiSearch bridges this semantic gap using dense vectors\u2014mapping the true intent of your question directly to the authoritative enacted provision.",
    },
  ],

  SIGNIFICANCE_OBJECTIVES: [
    {
      startSec: 0.1,
      endSec: 9.76,
      speakerCue: "Sub-Second Verified Statutory Lookup",
      text: "Why is this a game changer? For local administration, it turns hours of digging through paper archives into sub-second, verified statutory lookup.",
    },
    {
      startSec: 9.76,
      endSec: 20.29,
      speakerCue: "Preventing Policy Conflicts and Duplication",
      text: "For municipal lawmakers, it offers instant cross-referencing to check existing policies and prevent overlapping regulations before drafting new measures.",
    },
    {
      startSec: 20.29,
      endSec: 29.96,
      speakerCue: "Citizen Access with Privacy Protection",
      text: "And for the public, it provides transparent access while strictly isolating physical wet signatures and raw files to safeguard official privacy.",
    },
    {
      startSec: 29.96,
      endSec: 41.57,
      speakerCue: "5 Core Stakeholder Beneficiary Groups",
      text: "Chapter One defines five core beneficiary groups: SB records personnel, municipal officials, chief executives, policy researchers, and future scholars in local e-governance.",
    },
    {
      startSec: 41.57,
      endSec: 50.32,
      speakerCue: "Objective 1 \u00b7 Legislative Corpus & Metadata",
      text: "Our first objective established this legislative corpus, formalizing a structured metadata schema and a benchmark query collection.",
    },
    {
      startSec: 50.32,
      endSec: 61.08,
      speakerCue: "Objective 2 \u00b7 Bilingual OCR & Semantic Pipeline",
      text: "Our second objective engineered the retrieval pipeline\u2014pairing bilingual OCR repair and section slicing with FastEmbed vectors and reactive synchronization.",
    },
    {
      startSec: 61.08,
      endSec: 73,
      speakerCue: "Objective 3 \u00b7 IR Benchmark & ISO 25010 Quality",
      text: "And our third objective evaluated retrieval accuracy and system quality across four distinct search configurations using the ISO twenty-five zero ten standard.",
    },
  ],

  LITERATURE_FRAMEWORK: [
    {
      startSec: 0.1,
      endSec: 14.5,
      speakerCue: "Academic Precedents in Local E-Governance",
      text: "In Chapter Two, we ground our work in recent Philippine local governance literature\u2014including Dela Pe\u00f1a's 2025 study in Paracale and Dandan's 2026 evaluation under ISO 25010.",
    },
    {
      startSec: 14.5,
      endSec: 27.86,
      speakerCue: "DILG MC 2026-041 & National Initiatives",
      text: "At the national level, DILG Memorandum Circular 2026-041 established the e-Legis platform with the Vice Mayors' League, underscoring legislative digitization as a key priority.",
    },
    {
      startSec: 27.86,
      endSec: 44.75,
      speakerCue: "Municipal Autonomy & Specialized Local Lookup",
      text: "DILG circular 2026-041 demonstrates that while national repositories consolidate municipal policies, local government units require specialized, autonomous retrieval tools optimized for rapid municipal staff verification.",
    },
    {
      startSec: 44.75,
      endSec: 57.76,
      speakerCue: "Philippine Legal AI Framework & RAG",
      text: "Legal scholar Lim in 2025 demonstrated that training specialized models on Philippine law is cost-prohibitive, making Retrieval-Augmented Generation the ideal, legally sound path.",
    },
    {
      startSec: 57.76,
      endSec: 70.24,
      speakerCue: "LGU NLP Metrics & Bilingual Inclusivity",
      text: "Furthermore, Agpaoa and Palaoag's 2025 framework highlights evaluating municipal language systems across IR accuracy, efficiency, user trust, and bilingual inclusivity.",
    },
    {
      startSec: 70.24,
      endSec: 85.88,
      speakerCue: "Roque et al. Chunking Insights",
      text: "Among empirical studies, Roque and colleagues in 2024 tested embedding models over the Philippine Tax Code, revealing that fine-grained section chunking boosts Top-1 accuracy by 13% and MRR by 0.14.",
    },
    {
      startSec: 85.88,
      endSec: 99.51,
      speakerCue: "Structural Boundaries vs. Synthetic Fine-Tuning",
      text: "Roque's findings proved that splitting statutory provisions along legislative boundaries, such as preambles, articles, and specific subsections, outperforms fine-tuning larger models on synthetic data.",
    },
    {
      startSec: 99.51,
      endSec: 111.6,
      speakerCue: "The Critical Research Gap",
      text: "Yet a critical research gap remained: prior local work either indexed national statutes without user applications, or relied solely on keyword search without semantic vector ranking.",
    },
    {
      startSec: 111.6,
      endSec: 124.85,
      speakerCue: "Figure 1 \u00b7 Input-Process-Output Framework",
      text: "To address this gap, Figure 1 presents our Conceptual Paradigm: an Input-Process-Output model connecting municipal records, FastEmbed vectors, and ISO 25010 standards through RAD.",
    },
    {
      startSec: 124.85,
      endSec: 138,
      speakerCue: "Iterative Feedback & Continuous Refinement",
      text: "A continuous feedback loop ensures that experimental retrieval findings and user evaluations directly refine chunk boundaries, vector indexing, and administrative search workflows.",
    },
  ],

  METHODOLOGY: [
    {
      startSec: 0.1,
      endSec: 9.1,
      speakerCue: "Tailored Municipal Processing Architecture",
      text: "We followed Rapid Application Development, architecting an end-to-end processing pipeline tailored to Philippine local legislation.",
    },
    {
      startSec: 9.1,
      endSec: 20.19,
      speakerCue: "Stage 1 \u00b7 Requirements Planning & Prototyping",
      text: "Stage 1 begins with Requirements Planning and User Prototyping, designing interactive mockups alongside SB Polangui personnel before full-scale construction.",
    },
    {
      startSec: 20.19,
      endSec: 29.94,
      speakerCue: "Stage 2 \u00b7 Bilingual OCR & Spell Repair",
      text: "When a PDF is uploaded, PyMuPDF and Tesseract extract bilingual text, followed by automated spell repair to clean up scanned imperfections.",
    },
    {
      startSec: 29.94,
      endSec: 41.86,
      speakerCue: "Stage 2 \u00b7 Wet Signature Privacy Isolation",
      text: "Simultaneously, a signature isolation module detects attestation blocks, cataloging signatory names for administrators while withholding raw signatures from public results.",
    },
    {
      startSec: 41.86,
      endSec: 55.7,
      speakerCue: "Stage 3 \u00b7 Bilingual Synonym Expansion & Stems",
      text: "Our Application Layer incorporates bilingual synonym expansion and legal stem normalization, ensuring that queries phrased in Filipino or conversational English accurately map to formal statutory clauses.",
    },
    {
      startSec: 55.7,
      endSec: 68.42,
      speakerCue: "Stage 3 \u00b7 Section Slicing & 384-d Embeddings",
      text: "A structural parser then segments the text into clean sections, generating 384-dimensional embeddings with BGE-small and indexing them in Convex and SQLite FTS5.",
    },
    {
      startSec: 68.42,
      endSec: 78.66,
      speakerCue: "Stage 4 \u00b7 4 Retrieval Modes & Reranking",
      text: "Queries can run across four modes: Keyword, Vector, Hybrid, or our default Hybrid plus Rerank\u2014which boosts exact legal phrases and bilingual terminology.",
    },
    {
      startSec: 78.66,
      endSec: 90,
      speakerCue: "Stage 5 \u00b7 Lightweight CPU-Powered Architecture",
      text: "Connecting our Next.js frontend and Python FastAPI backend, this architecture runs entirely on standard CPU hardware without costly infrastructure.",
    },
  ],

  EVALUATION: [
    {
      startSec: 0.1,
      endSec: 9.96,
      speakerCue: "Dual Evaluation Methodology",
      text: "To evaluate our system, Chapter Three establishes a dual framework uniting quantitative IR accuracy with ISO twenty-five zero ten software quality.",
    },
    {
      startSec: 9.96,
      endSec: 20.96,
      speakerCue: "4-Point Relevance Judgment Matrix",
      text: "We adapted the IR confusion matrix into a four-point Relevance Judgment Matrix, grading provisions from three for completely relevant down to zero for non-relevant.",
    },
    {
      startSec: 20.96,
      endSec: 30.54,
      speakerCue: "Precision, Recall & Balanced F1-Score",
      text: "From these judgments, we compute Precision, Recall, and the balanced harmonic mean F1-Score, accounting for imbalanced statutory collections.",
    },
    {
      startSec: 30.54,
      endSec: 40.9,
      speakerCue: "Side-by-Side 4-Mode Ablation Testing",
      text: "By evaluating Keyword, Dense Vector, Hybrid, and Hybrid plus Rerank side-by-side, we directly measured the impact of semantic indexing and lexical re-ranking.",
    },
    {
      startSec: 40.9,
      endSec: 50.05,
      speakerCue: "IR Accuracy Metrics & Sub-200ms Latency",
      text: "The runner records Precision, Recall, Mean Reciprocal Rank, nDCG, citation correctness, and sub-200 millisecond response times.",
    },
    {
      startSec: 50.05,
      endSec: 61.27,
      speakerCue: "ISO/IEC 25010 Software Quality Survey",
      text: "Finally, our built-in Quality Survey collects structured evaluations across all eight ISO twenty-five zero ten software dimensions, including usability and security.",
    },
    {
      startSec: 61.27,
      endSec: 76.54,
      speakerCue: "Functional Completeness & Usability Acceptance",
      text: "Under ISO twenty-five zero ten, Functional Suitability was rated across functional completeness, correctness, and appropriateness, while administrative staff confirmed high usability and learnability for non-technical users.",
    },
    {
      startSec: 76.54,
      endSec: 91,
      speakerCue: "Weighted Mean Formula & Excellent Ratings",
      text: "Applying the statistical Weighted Mean formula, the system achieved overall ratings in the Excellent bracket between 4.21 and 5.00, confirming strong institutional acceptance.",
    },
  ],

  WALKTHROUGH: [
    {
      startSec: 0.1,
      endSec: 8.48,
      speakerCue: "Public Search Portal & Community Inquiries",
      text: "Here is the live portal. The landing screen showcases the town's seal, live repository metrics, and suggested citizen inquiries.",
    },
    {
      startSec: 8.48,
      endSec: 17.43,
      speakerCue: "Submitting a Real Municipal Inquiry",
      text: "Let's submit our question: 'Who is authorized to borrow funds for the sanitary landfill?' with Hybrid plus Rerank enabled, and click Search.",
    },
    {
      startSec: 17.43,
      endSec: 28.08,
      speakerCue: "Instant Grounded Legal Synthesis",
      text: "In milliseconds, the system produces a source-grounded legal synthesis, confirming Mayor Raymond Adrian Salceda's authority under Ordinance 046.",
    },
    {
      startSec: 28.08,
      endSec: 38.32,
      speakerCue: "Interactive Parsed Section Inspector",
      text: "Selecting Citation One opens the Section Inspector sheet, revealing the verbatim statutory wording of Section Two, its page number, and similarity scores.",
    },
    {
      startSec: 38.32,
      endSec: 48.19,
      speakerCue: "Browsing the Complete Document Repository",
      text: "In the Document Repository, users can browse the complete legislative catalog, from the Land Bank loan to maternal health and waterworks policies.",
    },
    {
      startSec: 48.19,
      endSec: 58.46,
      speakerCue: "Administrative Control & Document Intake",
      text: "Switching to the Admin Portal, staff manage active ordinances, review OCR accuracy, verify extracted signatories, and inspect indexed chunks.",
    },
    {
      startSec: 58.46,
      endSec: 72.32,
      speakerCue: "Live OCR Ingestion & Signatory Verification",
      text: "In the Admin Ingestion pipeline, municipal officers review OCR confidence scores, verify automatically isolated signatory blocks, and publish newly enacted ordinances into the live vector database in seconds.",
    },
    {
      startSec: 72.32,
      endSec: 80.65,
      speakerCue: "One-Click 4-Mode Benchmark Evaluation",
      text: "And under Retrieval Evaluation, administrators run comparative experiments across all four search modes with a single click.",
    },
    {
      startSec: 80.65,
      endSec: 92.78,
      speakerCue: "Bilingual Natural Language Resilience",
      text: "The system seamlessly understands bilingual inquiries, whether phrased in English, conversational Tagalog, or local phrasing, reliably retrieving the governing legal provisions.",
    },
    {
      startSec: 92.78,
      endSec: 105,
      speakerCue: "Strict Extractive Traceability",
      text: "Every returned insight is strictly extractive and fully traceable back to its enacted source, preventing hallucinations and preserving institutional legal authority.",
    },
  ],

  CONCLUSION: [
    {
      startSec: 0.1,
      endSec: 9.98,
      speakerCue: "Empowering Municipal Governance",
      text: "OrdiSearch transforms static paper ordinances into an accessible, intelligent legal resource that empowers local officials and citizens alike.",
    },
    {
      startSec: 9.98,
      endSec: 17,
      speakerCue: "Thank You from the Research Team",
      text: "From Kirby Cope, Arnel Hapin, and James Nebria of Bicol University\u2014thank you for watching.",
    },
  ],
};
