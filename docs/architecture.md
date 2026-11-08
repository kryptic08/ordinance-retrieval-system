# Architecture

## Components

- **Next.js frontend**: public search and document browser, administrator review console, evaluation and quality dashboards.
- **FastAPI backend**: authentication, upload, review, retrieval, evaluation, audit, and administrative settings.
- **SQLite**: relational metadata plus FTS5 virtual tables for keyword search. Foreign keys and WAL mode are enabled.
- **Local storage**: original PDFs, page images, and extracted text. Database rows reference files by relative path.
- **In-process worker**: claims queued ingestion and reindex jobs and executes the pipeline.
- **Embedding provider**: FastEmbed with `BAAI/bge-small-en-v1.5`; a deterministic hashing provider is available for tests and explicitly recorded as a fallback.

## Data model

```text
Document
  1---n DocumentVersion
         1---n Page
         1---n Section
                 1---n Chunk
Document 1---n Signatory
Document 1---n ProcessingJob
Document 1---n TextRevision
Document n---n DocumentRelationship (source/target)
BenchmarkQuery 1---n RelevanceJudgment ---1 Section
RetrievalExperiment (dataset JSON, per-query results JSON, metrics JSON)
QualityEvaluation
AuditLog, User, AppSetting
```

A document is the stable public identity. A version is one extraction attempt and owns its pages, sections, and chunks. Re-extraction creates a new version, marks the previous version non-current, and deactivates old chunks. Reindexing reuses the preserved page text.

Corrections are separate from source text: `corrected_text` is used when present, while `normalized_text` and `raw_text` remain available for audit. Every correction writes a `TextRevision`. Page corrections do not rebuild chunks; section corrections do. Re-extraction or reindex is required to propagate page text changes into retrieval.

## Ingestion pipeline

1. Validate PDF signature, size, and checksum. Reject duplicates by checksum.
2. Store the original file under `data/originals/<document-id>/`.
3. Extract text with PyMuPDF. Render page images.
4. For pages with too little text, run Tesseract and store OCR confidence and warnings.
5. Normalize text and remove repeated header/footer margin lines.
6. Detect the signature block and split it from the body.
7. Extract signatories with conservative name/title heuristics.
8. Parse chapters, articles, sections, whereas clauses, and unstructured blocks.
9. Build page-aware chunks from each section, preserving overlap.
10. Embed each chunk and persist it with the version.
11. Set `needs_review` when OCR, metadata, confidence, or signatory warnings require human review.
12. Activate automatically only when the document is clean and the administrator has not disabled auto-activation.

Ingestion is transactional at the version level. A failed job restores the previous current version and its active chunks.

## Retrieval

1. Parse the query and filters (year, document type, jurisdiction, LGU, document id).
2. Retrieve keyword candidates with FTS5 BM25.
3. Embed the query and score active chunks by cosine similarity.
4. Fuse normalized keyword and vector scores using the configured weights.
5. Optionally rerank the top candidates using a lexical overlap signal.
6. Apply minimum score thresholds.
7. Deduplicate nearby chunks from the same section and keep the best representative.
8. Return the top `k` with document metadata, page range, highlighted excerpt, and citation URLs.

The `/api/search/answer` endpoint is extractive: it returns selected sentences from retrieved sections with their citations. It does not generate free text.

## Review and publication

- `needs_review`: extraction completed but warnings or unverified signatories exist.
- `processed`: extraction completed and approved.
- `failed`: extraction failed; the previous version remains available if one existed.
- `is_active`: controls public visibility. Approval does not activate automatically.
- Low-confidence or signatory-bearing documents are never auto-activated.

## Security boundaries

- Public routes: search, active document list/detail, PDF file, system health.
- Reviewer routes: ingestion jobs, review corrections, evaluation data.
- Administrator routes: uploads, activation, deletion, users, settings, audit.
- Authentication uses JWT in an `httpOnly`, `SameSite=Lax` cookie. The API also accepts a Bearer token for scripted clients.
- Uploads are validated as PDFs, size-limited, and stored outside the web root. File responses use `FileResponse` rather than path concatenation.
