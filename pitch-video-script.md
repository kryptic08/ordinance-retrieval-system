# Pitch Video Production Architecture & Master Script
## System: OrdiSearch — Vector Search-Based Local Ordinance & Policy Retrieval System
### Client Beneficiary: Office of the Secretary to the Sangguniang Bayan, LGU of Polangui, Albay
### Researchers: Kirby Cope, Arnel Hapin, James Nebria
### Target Duration: ~6 to 7 minutes (1920x1080 @ 30fps)

---

## 1. Structure Overview

| Scene | Section | Duration | Key Visual & Motion Graphics |
| :--- | :--- | :--- | :--- |
| **Scene 1** | **Introduction & Researcher Showcase** | 0:00 - 1:10 (70s) | Polangui Seal banner, animated portrait cards for **Kirby Cope**, **Arnel Hapin**, and **James Nebria** (with Bicol University badge), transition into municipal legislative problem. |
| **Scene 2** | **The Municipal Challenge (Problem Context)** | 1:10 - 2:05 (55s) | Animated filing cabinets vs digital confusion, lexical mismatch visual ("midnight operation" vs "nighttime trade restrictions"), PDF fragmentation. |
| **Scene 3** | **Significance & Research Objectives** | 2:05 - 3:15 (70s) | Kinetic cards for Sangguniang Bayan staff, LGU officials, Chief Executives, and Researchers. The 3 specific research objectives with animated checklist indicators. |
| **Scene 4** | **Methodology & RAD SDLC** | 3:15 - 4:25 (70s) | The Rapid Application Development (RAD) cyclic loop (Requirements, User Design, Construction, Cutover) + The 3-Tier Architecture (Presentation, Application, Data Layer). |
| **Scene 5** | **System Walkthrough & Live Retrieval Demo** | 4:25 - 5:50 (85s) | High-fidelity UI mockup recreation: Chat experience with natural queries, dual BM25 + FastEmbed vector scoring, instant section-level citations, page highlights, and admin review dashboard. |
| **Scene 6** | **Evaluation (ISO/IEC 25010 & IR Metrics)** | 5:50 - 6:40 (50s) | Dynamic animated charts: Precision@K, Recall@K, MRR (0.76+), nDCG@K, Likert weighted mean scoring (Functional Suitability, Usability, Efficiency). |
| **Scene 7** | **Conclusion & Call to Action** | 6:40 - 7:15 (35s) | Civic modernization summary, transparent public governance, closing credentials with researchers and Polangui seal. |

---

## 2. Voicebox Narration Script (Timestamped)

### Scene 1: Introduction & Meet the Researchers (0:00 - 1:10)
> **Narration**:  
> "In the heart of Albay, the first-class Municipality of Polangui enacts dozens of landmark local ordinances and public policies each year through its municipal legislative council, the Sangguniang Bayan. From community curfews and environmental sanitation to business permitting and zoning laws, these policies govern daily civic life.  
> But how easily can municipal staff and citizens locate the exact legal clause when they need it most?  
> Good day. We are researchers Kirby Cope, Arnel Hapin, and James Nebria. Together with the Office of the Secretary to the Sangguniang Bayan of Polangui, Albay, we present **OrdiSearch**: A Vector Search-Based Local Ordinance and Policy Retrieval System."

### Scene 2: The Municipal Challenge (1:10 - 2:05)
> **Narration**:  
> "For decades, municipal records custodians have relied on manual archiving and traditional keyword search. But traditional systems suffer from a severe operational flaw: lexical mismatch.  
> When a citizen or municipal clerk asks, *'Are businesses allowed to operate after midnight?'*, keyword search searches strictly for the word 'midnight'. If the enacted law codifies it as *'permitted commercial operating hours and nighttime trade restrictions'*, standard search comes up completely empty.  
> Administrative personnel spend countless hours manually flipping through multi-page PDF scans and printed binders, trying to guess the formal legal phrasing. Furthermore, existing LLM chatbots often hallucinate legal claims—an unacceptable liability for government administration.  
> Polangui needed a solution that bridges natural language queries to official statutes while ensuring 100% strict traceability to verified enactments."

### Scene 3: Significance & Research Objectives (2:05 - 3:15)
> **Narration**:  
> "OrdiSearch delivers measurable institutional significance across four key civic levels:  
> First, for the **Office of the Secretary to the Sangguniang Bayan**, it drastically cuts down document search time and lets staff query records using natural conversational language.  
> Second, for **LGU Officials and Lawmakers**, it acts as a reliable reference tool to cross-reference prior policies before passing new resolutions or approving permits.  
> Third, for **Local Chief Executives**, it proves a low-cost, CPU-efficient digital transformation model that requires no expensive enterprise licenses.  
> And fourth, for **Policy and AI Researchers**, it contributes empirical data on dense vector embeddings and chunking over Philippine legal corpora.  
> To achieve this, our study pursues three specific objectives:  
> One: Determine the exact document, metadata, and query retrieval requirements of the Sangguniang Bayan.  
> Two: Design and develop a section-aware vector retrieval system combining dense semantic embeddings with exact statutory citations.  
> And Three: Rigorously evaluate system accuracy, ranking quality, response speed, and software quality using the international ISO/IEC 25010 standard."

### Scene 4: Methodology & System Architecture (3:15 - 4:25)
> **Narration**:  
> "Our development followed the Rapid Application Development—or RAD—methodology. Through iterative 4-phase cycles of Requirements Planning, User Design Prototyping, Construction, and Cutover, we co-designed the platform hand-in-hand with municipal staff.  
> The system is architected as an enterprise-grade Three-Tier Platform:  
> In the **Presentation Layer**, a modern Next.js 15 interface with React 19 provides both a clean conversational search portal for public inquiries and an administrator dashboard for document custodians.  
> In the **Application Layer**, FastAPI powers two deterministic pipelines: the Document Ingestion Pipeline, which extracts text via PyMuPDF and Tesseract OCR, parses legal section boundaries, and generates 384-dimensional dense vectors using FastEmbed's BAAI bge-small model; and the Hybrid Retrieval Pipeline, which fuses BM25 lexical keyword scores with dense cosine semantic similarity.  
> In the **Data Layer**, SQLite with FTS5 and real-time reactive cloud storage guarantee immediate local indexing, audit logging, and signature protection without leaking raw signatures to the public."

### Scene 5: System Walkthrough & Live Retrieval Demo (4:25 - 5:50)
> **Narration**:  
> "Let us walk through the system in action.  
> On the public search screen, a user types an everyday conversational question: *'What are the curfew hours and exemptions for minors?'*  
> Watch how OrdiSearch processes this: Without requiring any legal jargon, the hybrid engine instantly surfaces the exact section from Municipal Ordinance No. 2021-08.  
> Notice that unlike generative AI models that make up text, OrdiSearch is strictly extractive. It highlights the verbatim statutory clause, displays the exact section title, and cites the validated source document down to the exact page number.  
> On the administrative side, records personnel can upload newly scanned municipal ordinances. The automated pipeline detects optical quality, flags low-confidence text for human verification, extracts signatories, and commits the vectors directly into the searchable index in seconds."

### Scene 6: Evaluation & ISO/IEC 25010 Quality (5:50 - 6:40)
> **Narration**:  
> "To guarantee academic and operational rigor, OrdiSearch was subjected to dual validation.  
> In Information Retrieval testing using our Relevance Judgment Matrix, the hybrid vector and BM25 configuration demonstrated superior performance with high Precision@K, a Mean Reciprocal Rank exceeding 0.76, and an nDCG score proving that the most relevant statutory provisions consistently rank at the top within milliseconds.  
> In human quality evaluation under the ISO/IEC 25010 standard, administrative staff and technical experts evaluated the system across Functional Suitability, Performance Efficiency, Usability, and Reliability. The computed weighted mean achieved ratings in the 'Very Good' to 'Excellent' bands, confirming that municipal personnel can easily learn, operate, and trust the platform in their daily workflow."

### Scene 7: Conclusion & Closing Pitch (6:40 - 7:15)
> **Narration**:  
> "OrdiSearch demonstrates that modern AI retrieval doesn't need to replace human legal interpretation—it empowers local governance by making public policy accessible, searchable, and transparent.  
> On behalf of researchers Kirby Cope, Arnel Hapin, and James Nebria, and the Local Government Unit of Polangui, Albay, thank you for listening to our presentation. OrdiSearch: Source-grounded civic intelligence for responsive local governance."
