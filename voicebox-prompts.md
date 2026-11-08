# Voicebox TTS Audio Generation Guide
## OrdiSearch Pitch Video (7 min 15 sec)

Your Voicebox MCP Server is located at:
* **URL:** `http://127.0.0.1:17493/mcp`
* **Header:** `X-Voicebox-Client-Id: claude-code`

To generate the cloned voiceover audio files for each scene, send each section below to your Voicebox server or API and save the audio files into:
`c:\Users\coped\Documents\ordinance-retrieval-system\remotion-video\public\audio\`

---

### File: `public/audio/scene1_intro.mp3` (Target: ~70s)
> "In the heart of Albay, the first-class Municipality of Polangui enacts dozens of landmark local ordinances and public policies each year through its municipal legislative council, the Sangguniang Bayan. From community curfews and environmental sanitation to business permitting and zoning laws, these policies govern daily civic life.
> But how easily can municipal staff and citizens locate the exact legal clause when they need it most?
> Good day. We are researchers Kirby Cope, Arnel Hapin, and James Nebria. Together with the Office of the Secretary to the Sangguniang Bayan of Polangui, Albay, we present OrdiSearch: A Vector Search-Based Local Ordinance and Policy Retrieval System."

---

### File: `public/audio/scene2_problem.mp3` (Target: ~55s)
> "For decades, municipal records custodians have relied on manual archiving and traditional keyword search. But traditional systems suffer from a severe operational flaw: lexical mismatch.
> When a citizen or municipal clerk asks, 'Are businesses allowed to operate after midnight?', keyword search searches strictly for the word 'midnight'. If the enacted law codifies it as 'permitted commercial operating hours and nighttime trade restrictions', standard search comes up completely empty.
> Administrative personnel spend countless hours manually flipping through multi-page PDF scans and printed binders, trying to guess the formal legal phrasing. Furthermore, existing LLM chatbots often hallucinate legal claims—an unacceptable liability for government administration.
> Polangui needed a solution that bridges natural language queries to official statutes while ensuring 100% strict traceability to verified enactments."

---

### File: `public/audio/scene3_significance_objectives.mp3` (Target: ~70s)
> "OrdiSearch delivers measurable institutional significance across four key civic levels:
> First, for the Office of the Secretary to the Sangguniang Bayan, it drastically cuts down document search time and lets staff query records using natural conversational language.
> Second, for LGU Officials and Lawmakers, it acts as a reliable reference tool to cross-reference prior policies before passing new resolutions or approving permits.
> Third, for Local Chief Executives, it proves a low-cost, CPU-efficient digital transformation model that requires no expensive enterprise licenses.
> And fourth, for Policy and AI Researchers, it contributes empirical data on dense vector embeddings and chunking over Philippine legal corpora.
> To achieve this, our study pursues three specific objectives:
> One: Determine the exact document, metadata, and query retrieval requirements of the Sangguniang Bayan.
> Two: Design and develop a section-aware vector retrieval system combining dense semantic embeddings with exact statutory citations.
> And Three: Rigorously evaluate system accuracy, ranking quality, response speed, and software quality using the international ISO/IEC 25010 standard."

---

### File: `public/audio/scene4_methodology.mp3` (Target: ~70s)
> "Our development followed the Rapid Application Development—or RAD—methodology. Through iterative 4-phase cycles of Requirements Planning, User Design Prototyping, Construction, and Cutover, we co-designed the platform hand-in-hand with municipal staff.
> The system is architected as an enterprise-grade Three-Tier Platform:
> In the Presentation Layer, a modern Next.js 15 interface with React 19 provides both a clean conversational search portal for public inquiries and an administrator dashboard for document custodians.
> In the Application Layer, FastAPI powers two deterministic pipelines: the Document Ingestion Pipeline, which extracts text via PyMuPDF and Tesseract OCR, parses legal section boundaries, and generates 384-dimensional dense vectors using FastEmbed's BAAI bge-small model; and the Hybrid Retrieval Pipeline, which fuses BM25 lexical keyword scores with dense cosine semantic similarity.
> In the Data Layer, SQLite with FTS5 and real-time reactive cloud storage guarantee immediate local indexing, audit logging, and signature protection without leaking raw signatures to the public."

---

### File: `public/audio/scene5_walkthrough.mp3` (Target: ~85s)
> "Let us walk through the system in action.
> On the public search screen, a user types an everyday conversational question: 'What are the curfew hours and exemptions for minors?'
> Watch how OrdiSearch processes this: Without requiring any legal jargon, the hybrid engine instantly surfaces the exact section from Municipal Ordinance No. 2021-08.
> Notice that unlike generative AI models that make up text, OrdiSearch is strictly extractive. It highlights the verbatim statutory clause, displays the exact section title, and cites the validated source document down to the exact page number.
> On the administrative side, records personnel can upload newly scanned municipal ordinances. The automated pipeline detects optical quality, flags low-confidence text for human verification, extracts signatories, and commits the vectors directly into the searchable index in seconds."

---

### File: `public/audio/scene6_evaluation.mp3` (Target: ~50s)
> "To guarantee academic and operational rigor, OrdiSearch was subjected to dual validation.
> In Information Retrieval testing using our Relevance Judgment Matrix, the hybrid vector and BM25 configuration demonstrated superior performance with high Precision@K, a Mean Reciprocal Rank exceeding 0.76, and an nDCG score proving that the most relevant statutory provisions consistently rank at the top within milliseconds.
> In human quality evaluation under the ISO/IEC 25010 standard, administrative staff and technical experts evaluated the system across Functional Suitability, Performance Efficiency, Usability, and Reliability. The computed weighted mean achieved ratings in the 'Very Good' to 'Excellent' bands, confirming that municipal personnel can easily learn, operate, and trust the platform in their daily workflow."

---

### File: `public/audio/scene7_conclusion.mp3` (Target: ~35s)
> "OrdiSearch demonstrates that modern AI retrieval doesn't need to replace human legal interpretation—it empowers local governance by making public policy accessible, searchable, and transparent.
> On behalf of researchers Kirby Cope, Arnel Hapin, and James Nebria, and the Local Government Unit of Polangui, Albay, thank you for listening to our presentation. OrdiSearch: Source-grounded civic intelligence for responsive local governance."

---

## Remotion Audio Integration:
In [`remotion-video/src/Composition.tsx`](file:///c:/Users/coped/Documents/ordinance-retrieval-system/remotion-video/src/Composition.tsx), you can add the `<Audio />` tags directly into each sequence:
```tsx
import { Audio, staticFile } from "remotion";

<Sequence from={introFrom} durationInFrames={SCENES.INTRO.frames} name="Intro_Researchers">
  <Audio src={staticFile("audio/scene1_intro.mp3")} />
  <SceneIntro />
</Sequence>
```
