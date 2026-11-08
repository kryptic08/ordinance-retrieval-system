import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Database, FileSearch, Lock, ScanText, Scale, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Methodology · OrdiSearch",
  description: "How OrdiSearch ingests, indexes, retrieves, and evaluates ordinances for the Municipality of Polangui, Albay.",
};

const pipeline = [
  {
    icon: FileSearch,
    title: "1. Preservation and extraction",
    body: "Each upload is checksummed, stored unchanged, and processed as a version. Digital text is extracted with PyMuPDF. Pages without a usable text layer are rendered and passed through Tesseract OCR. Both the raw and normalized text are retained per page.",
  },
  {
    icon: ScanText,
    title: "2. Structure and quality review",
    body: "A rule-based parser identifies titles, WHEREAS clauses, sections, articles, chapters, and signature blocks. Low-confidence OCR, missing metadata, and ambiguous signatories route a document to human review instead of activating it automatically.",
  },
  {
    icon: Database,
    title: "3. Section-aware indexing",
    body: "Sections are split into overlapping, page-aware chunks. Signature blocks are excluded from semantic retrieval but retained for review. Chunks are embedded locally with FastEmbed BAAI/bge-small-en-v1.5 (384 dimensions), while SQLite FTS5 supplies keyword matching.",
  },
  {
    icon: Scale,
    title: "4. Hybrid retrieval with citations",
    body: "Semantic cosine similarity and keyword relevance are combined, with an optional reranking stage. Results are grouped back to their section, page range, and document, and every citation points to the preserved PDF.",
  },
];

export default function AboutPage() {
  return (
    <div>
      <section className="border-b border-paper-300 bg-paper-100">
        <div className="container-page py-12 sm:py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-civic-700">Methodology</p>
          <h1 className="mt-3 max-w-4xl font-serif text-3xl font-semibold leading-tight text-ink-900 sm:text-5xl">
            Retrieval you can trace back to the original ordinance.
          </h1>
          <p className="mt-4 max-w-3xl text-[15px] leading-7 text-ink-700">
            This system is built for source-grounded access to local ordinances. It does not generate a
            legal answer from a language model; it retrieves relevant passages, shows the extracted text,
            and links to the exact source page. Retrieval scores describe textual relevance only.
          </p>
        </div>
      </section>

      <section className="container-page py-12">
        <div className="grid gap-4 md:grid-cols-2">
          {pipeline.map((step) => (
            <div key={step.title} className="surface p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-civic-50 text-civic-700">
                <step.icon className="h-5 w-5" aria-hidden />
              </span>
              <h2 className="mt-4 font-serif text-xl font-semibold text-ink-900">{step.title}</h2>
              <p className="mt-2 text-sm leading-6 text-ink-700">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-paper-300 bg-paper-100">
        <div className="container-page grid gap-8 py-12 lg:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-civic-700">Retrieval modes</p>
            <h2 className="mt-2 font-serif text-2xl font-semibold text-ink-900">Choose how evidence is matched</h2>
            <p className="mt-2 text-sm leading-6 text-ink-600">
              Different modes expose trade-offs for a thesis evaluation. The same query can be run under
              each configuration and compared with manually judged relevance.
            </p>
          </div>
          <div className="lg:col-span-2 grid gap-3 sm:grid-cols-2">
            {[
              ["Keyword", "SQLite FTS5 with BM25 ranking. Strong for ordinance numbers and exact legal terms."],
              ["Semantic", "Local dense embeddings. Strong for paraphrases and everyday wording."],
              ["Hybrid", "Combines normalized keyword and semantic scores. The default public mode."],
              ["Hybrid + rerank", "Adds lexical overlap and phrase cues on top of hybrid candidates."],
            ].map(([title, body]) => (
              <div key={title} className="rounded-lg border border-paper-300 bg-white p-4">
                <p className="text-sm font-semibold text-ink-900">{title}</p>
                <p className="mt-1 text-xs leading-5 text-ink-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page grid gap-8 py-12 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-ink-900">Evaluation</h2>
          <p className="mt-3 text-sm leading-6 text-ink-700">
            Evaluation is separate from the public search experience. Administrators create a benchmark
            query set, manually grade the relevance of retrieved sections, and run experiments under
            controlled configurations. The system reports Precision@K, Recall@K, MRR, nDCG, citation
            correctness, and latency. Only judgments entered by reviewers are used—no relevance labels
            are generated automatically.
          </p>
          <p className="mt-3 text-sm leading-6 text-ink-700">
            Usability and quality responses are also collected separately and can be excluded from
            analysis when marked as test data. Reported figures should always be read alongside the
            corpus version, embedding model, and configuration recorded with each experiment.
          </p>
        </div>
        <div className="surface p-6">
          <h3 className="flex items-center gap-2 font-semibold text-ink-900">
            <Lock className="h-4 w-4 text-civic-700" aria-hidden /> Security and integrity
          </h3>
          <ul className="mt-3 space-y-3 text-sm leading-6 text-ink-700">
            <li>Administration requires an authenticated account with an httpOnly session cookie.</li>
            <li>Uploads are restricted to PDF, size-limited, checksummed, and stored outside the public web root.</li>
            <li>Processing is versioned; re-indexing does not destroy the preserved original file.</li>
            <li>Administrative changes are written to an audit log with actor and request context.</li>
            <li>Retrieved text is clearly separated from original-document authority.</li>
          </ul>
        </div>
      </section>

      <section className="container-page pb-12">
        <div className="rounded-xl border border-gold-500/40 bg-gold-100/50 p-6 dark:border-amber-500/30 dark:bg-amber-500/10">
          <h2 className="flex items-center gap-2 font-serif text-xl font-semibold text-ink-900 dark:text-[#f3f3f3]">
            <ShieldCheck className="h-5 w-5 text-gold-700 dark:text-amber-400" aria-hidden /> Limitations and legal notice
          </h2>
          <div className="mt-3 grid gap-4 text-sm leading-6 text-ink-700 md:grid-cols-2">
            <p>
              OCR can misread names, numbers, and punctuation. Section detection is structural and may
              split or merge provisions incorrectly. A document may be amended, superseded, or repealed
              without appearing in this corpus.
            </p>
            <p>
              Retrieval scores are not probabilities of legal applicability. This system is not legal
              advice and does not replace the official records of the issuing local government unit.
              Always verify the cited PDF and consult the proper office for authoritative text.
            </p>
          </div>
          <Link href="/" className="btn-primary mt-5 !py-2">
            Search the corpus <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </section>
    </div>
  );
}
