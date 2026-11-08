# OrdiSearch — Local Ordinance and Policy Retrieval System
**Official Civic Retrieval System for the Municipality of Polangui, Province of Albay**

OrdiSearch is a source-grounded retrieval system for enacted municipal ordinances, resolutions, and local policy documents. It ingests PDFs, extracts legal provisions along hierarchical boundaries, runs bilingual (English + Filipino) OCR spell repair, computes dense vector embeddings, and returns exact section citations with direct source page links.

The application includes:
- **Frontend:** Next.js 15, Tailwind CSS, shadcn/ui components, dark mode (solid `#111111` obsidian), and Convex real-time database support.
- **Backend:** FastAPI, SQLite with FTS5, PyMuPDF, Tesseract OCR, FastEmbed (`BAAI/bge-small-en-v1.5`), and bilingual legal stem expansion.
- **Google Gemini AI OCR Assistant:** Multi-model spell & formatting cleaner with automatic fallback cycling across `gemini-3.5-flash-lite`, `gemini-flash-lite-latest`, `gemini-3.1-flash-lite`, `gemini-3-flash-preview`, `gemini-3.5-flash`, and `gemini-3.8-flash`.
- **Sliced Chunked Uploads:** Automated client-side 3 MB chunking to stream arbitrarily large municipal PDFs past serverless body size limits (e.g. Vercel 4.5 MB ceiling).
- **Convex Database Integration:** Real-time reactive storage for documents, legal sections, semantic vector chunks, user chat history, and audit telemetry.
- **Unified Dev Launcher:** One-command startup via `npm run dev` launching both FastAPI and Next.js concurrently.

## What it does

- **Official Polangui Seal:** Features the verified municipal seal of Polangui, Albay as the brand identity and dynamic favicon.
- **Convex Cloud & Local Storage:** Supports both SQLite FTS5 local storage and Convex reactive database with vector indexing.
- Accepts text-layer, scanned, and mixed PDFs up to 50 MB.
- Preserves the original file, page images, extracted text, and a version history.
- Detects sections, articles, chapters, whereas clauses, and signature blocks.
- Withholds raw PDF downloads and physical signatures from the public interface to protect personal privacy and prevent signature harvesting.
- Combines keyword ranking with cosine similarity over local embeddings (BAAI/bge-small-en-v1.5).
- Returns section-level citations with page numbers and parsed statutory excerpts.
- Administrator portal for intake, OCR review, metadata correction, and relevance evaluation.

## Convex Database Setup

OrdiSearch comes pre-configured with a full Convex database schema and reactive client provider (`frontend/convex/schema.ts`). To connect your Convex account and initialize your project:

```bash
cd frontend
npx convex dev
```

1. The Convex CLI will open your browser to log in with your existing Convex account.
2. It will prompt you to create a new project (e.g. `ordisearch` or `polangui-ordinances`).
3. It will automatically populate `.env.local` with `NEXT_PUBLIC_CONVEX_URL` and sync your database schema!

## Verification status

What has been run locally:

- Backend API tests: `35 passed` with `pytest`.
- Frontend production build: `npm run build` completes for all routes.
- End-to-end flow: upload a digital PDF, extract and chunk it, embed it, activate it, and retrieve the correct curfew section with a page citation.
- Digital-text signatory extraction: both signatories in the sample ordinance are detected with the correct titles.
- Next.js rewrite and cookie session: production servers for both apps were started, and login, `/auth/me`, and search succeeded through `http://127.0.0.1:3000/backend/*`.
- Large upload through the Next.js development proxy: a 16.25 MB, 35-page PDF uploaded successfully after raising the default 10 MB proxy body limit.
- Backup helper: copies the SQLite database, originals, and processed files.

What has not been verified locally:

- PostgreSQL or pgvector. SQLite is the supported and tested database.
- Docker deployment.
- Full browser interaction and PDF viewer behavior. HTTP-level page and API responses were checked.
- Retrieval quality claims on a real LGU corpus. Use the evaluation workflow with manually judged queries; do not publish placeholder metrics.

## Architecture

```text
Browser (Next.js)
   |  /backend/* rewrite, httpOnly cookie
   v
FastAPI (/api)
   |-- Auth and role checks
   |-- Upload and review routes
   |-- Search and extractive answer routes
   |-- Evaluation and quality routes
   |
   +--> SQLite: metadata, pages, sections, chunks, FTS5, judgments, audit
   +--> data/originals: preserved PDFs
   +--> data/processed: page images and extracted text
   +--> Background worker: extraction, OCR, chunking, embeddings
```

Search flow: candidate chunks from FTS5 and vector similarity -> score fusion -> optional rerank -> deduplicate by section -> citation assembly -> extractive answer selection from the top cited passages.

The backend starts the ingestion worker in-process. Set `WORKER_ENABLED=false` when running multiple API processes against the same database, and run a dedicated worker instead.

See `docs/architecture.md`, `docs/evaluation.md`, and `docs/security-and-operations.md`.

## Quick start (Unified One-Command Startup)

Prerequisites:
- Python 3.12 (with virtualenv at `backend/.venv`)
- Node.js 20 or newer
- Tesseract 5.x for OCR (optional for text-layer PDFs)

```powershell
cd C:\Users\coped\Documents\ordinance-retrieval-system

# 1. Setup environment file
Copy-Item .env.example .env
# Edit .env: set SECRET_KEY, ADMIN_PASSWORD, and optional GEMINI_API_KEY

# 2. Run both Frontend and Backend concurrently
npm run dev
```

The launcher will automatically find the Python environment in `backend/.venv`, boot FastAPI at `http://127.0.0.1:8000`, start Next.js at `http://localhost:3000`, and stream unified colored logs.

Or run individually:
```powershell
# Terminal 1 - Backend
python -m uvicorn app.main:app --app-dir backend --reload --port 8000

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Open:

- Public search: <http://localhost:3000>
- Administrator: <http://localhost:3000/login>
- API docs: <http://localhost:8000/docs>

The first startup creates the SQLite schema, FTS5 tables and triggers, and the administrator account from `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

The first FastEmbed request downloads the embedding model. Until it is available, the system falls back to a deterministic hashing provider and labels that provider in metadata. Hashing is not a semantic model and should not be used for thesis evaluation.

### Demo data

The repository may contain `data/sample_2024-05.pdf` and `data/ordinance.db` from development. Treat them as demo data only. Delete both before collecting evaluation results, then ingest the real corpus.

## Configuration

All settings are environment variables read from the project root `.env` or `backend/.env`. Copy `.env.example` and keep `.env` out of version control.

Important settings:

| Variable | Purpose |
| --- | --- |
| `SECRET_KEY` | JWT signing key. Replace before deployment. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Initial administrator account. |
| `DATABASE_URL` | SQLite URL. Relative paths resolve from the project root. |
| `DATA_DIR` | Root for originals and processed files. |
| `TESSERACT_CMD` | Absolute path to `tesseract.exe` on Windows. |
| `OCR_ENABLED`, `OCR_LANG`, `OCR_DPI` | OCR behavior. |
| `EMBEDDING_PROVIDER` | `fastembed` in normal use; `hashing` only for deterministic tests. |
| `EMBEDDING_MODEL` | Defaults to `BAAI/bge-small-en-v1.5`. |
| `CHUNK_*` | Chunk size, overlap, and minimum length. |
| `RETRIEVAL_*`, `VECTOR_WEIGHT`, `KEYWORD_WEIGHT` | Ranking thresholds and fusion weights. |
| `RATE_LIMIT_SEARCH_PER_MINUTE` | Search rate limit per client. |
| `WORKER_ENABLED` | In-process ingestion worker toggle. |
| `ALLOWED_ORIGINS` | CORS origins for direct browser access to the API. |
| `API_PROXY_URL` | Next.js rewrite target for `/backend/*`. |

The Next.js proxy has a 60 MB request-body limit and a 120-second proxy timeout in `frontend/next.config.mjs`. Keep the body limit above `MAX_UPLOAD_MB` so multipart overhead does not cause the proxy to truncate large uploads.

Retrieval and chunking values can also be overridden at runtime from **Admin -> Settings**. Runtime overrides are stored in the database and recorded in each evaluation experiment.

## Using the system

1. Sign in at `/login`.
2. Open **Admin -> Documents** and upload one or more PDFs.
3. Wait for the processing job to finish.
4. Review metadata, OCR text, sections, and signatories.
5. Correct pages or sections where needed. Section corrections rebuild embeddings immediately.
6. Use **Approve** to mark reviewed sections as verified.
7. Use **Activate for public search** to publish. Approval and activation are separate actions.
8. Search from the public interface and follow the page citation to the PDF.

Clean digital documents may activate automatically when no review warnings are raised. OCR, low confidence, missing metadata, or signatory warnings set the document to `needs_review` and keep it unpublished.

## Testing

```powershell
cd backend
.venv\Scripts\python.exe -m pytest -q
```

Tests use a temporary SQLite database, temporary data directory, hashing embeddings, and the test administrator account. They do not modify `data/ordinance.db`.

```powershell
cd frontend
npm run lint
npm run build
```

OCR tests are skipped automatically when Tesseract is unavailable.

## Evaluation

The benchmark is manual by design:

1. Activate the real corpus.
2. Add representative queries with categories such as exact term, paraphrase, multi-section, and unanswerable.
3. Judge retrieved sections on a 0-3 relevance scale.
4. Run experiments for `keyword`, `vector`, and `hybrid` configurations at a fixed `top_k`.
5. Export the experiment CSV and record the corpus version, embedding model, chunk settings, and thresholds.

The system reports precision, recall, MRR, nDCG, latency, empty-retrieval behavior, and citation correctness. Do not report metrics from the demo corpus or from unjudged queries. The protocol and formulas are documented in `docs/evaluation.md`.

## Production notes

- Replace the development `SECRET_KEY` and administrator password.
- Keep `data/` on backed-up storage. The SQLite database and original PDFs are both required for a complete restore.
- Serve the frontend and API over HTTPS. Cookies are `httpOnly` and `SameSite=Lax`; set a secure deployment origin accordingly.
- Put a reverse proxy in front of the API and preserve client IP headers for rate limiting and audit logs.
- Run one ingestion worker. Multiple API processes with `WORKER_ENABLED=true` can race on the same job queue.
- Back up before schema upgrades. Schema creation is automatic for a new database; this project does not currently ship Alembic migrations.
- Review `docs/security-and-operations.md` before exposing the system outside a local network.

## Project layout

```text
backend/
  app/
    api/routes/       FastAPI routes
    chunking/         Legal structure parser and chunk builder
    core/             Configuration, security, rate limiting
    db/               ORM models, session, schema initialization
    embeddings/       FastEmbed, hashing fallback, registry
    evaluation/       Metrics and experiment runner
    ingestion/        PDF extraction, OCR, signatures, pipeline
    retrieval/        Hybrid search and citation assembly
    schemas/          Pydantic request/response models
    services/         Storage, audit, runtime settings
    workers/          Background ingestion queue
  tests/              Pytest suite
frontend/
  app/(public)/       Public search and document browser
  app/admin/          Review, evaluation, quality, settings, audit
  components/         UI and feature components
  lib/                Typed API client and models
docs/                 Architecture, evaluation, operations
scripts/              Local setup and backup helpers
```

## License

This project is licensed under the [MIT License](LICENSE).
