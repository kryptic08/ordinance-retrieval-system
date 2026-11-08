# Security and operations

## Before deployment

- Replace `SECRET_KEY` with a long random value and rotate it if it was ever shared.
- Replace the seeded administrator password. The seed only creates the account when it does not exist.
- Use HTTPS and set `ALLOWED_ORIGINS` to the real frontend origin.
- Keep `.env` and `data/` out of version control.
- Restrict network access to the administrator routes.
- Review the audit log after ingestion and user changes.

## Accounts and authorization

Roles:

- `admin`: upload, activate, delete, manage users, change settings, view audits.
- `reviewer`: review pages, sections, signatories, jobs, and evaluation data.
- Public: search active documents and open PDFs.

The JWT is stored in an `httpOnly` cookie with `SameSite=Lax`. The API also accepts `Authorization: Bearer <token>`. Passwords are hashed with bcrypt. The default token lifetime is eight hours.

There is no password reset or multi-factor authentication. For an internet-facing deployment, add both or place the administrator interface behind a separate access gateway.

## Upload and file handling

- Only PDF files are accepted; the check is based on signature, not only the filename.
- Maximum upload size defaults to 50 MB (`MAX_UPLOAD_MB`).
- The Next.js proxy accepts request bodies up to 60 MB and allows 120 seconds for proxied requests. Keep this above `MAX_UPLOAD_MB` to allow for multipart overhead.
- Originals are stored under a generated document id, not the user filename.
- File downloads are served by the API after checking document visibility.
- Deleting a document removes its database rows and stored files. Confirm with the exact title or id.

## Rate limiting

Search and login routes are rate-limited in memory per client. The default search limit is 60 requests per minute. In-memory limits are per API process; a multi-process deployment needs a shared limiter or a reverse-proxy limit.

## Background worker

The worker runs inside the API process by default. Two API processes with `WORKER_ENABLED=true` can claim the same job. For a larger deployment:

1. Set `WORKER_ENABLED=false` on API processes.
2. Run a single dedicated worker process against the same database and storage.
3. Keep uploads on shared storage if the worker runs on another host.

## Backup and restore

A complete backup contains:

- `data/ordinance.db` (or the configured SQLite file).
- `data/originals/`.
- `data/processed/`.

Use `scripts/backup-data.ps1` to copy all three into a timestamped folder. Stop the API or use SQLite's backup command for a consistent database copy. Restore the database and both storage folders together; metadata alone is not enough to reproduce PDFs or page images.

## Schema changes

The application creates tables and FTS5 structures at startup for a new database. It is not an Alembic migration system. Before upgrading an existing deployment:

1. Back up the database and data folders.
2. Read the release notes or diff the models.
3. Apply schema changes in a staging copy.
4. Verify ingestion and search before switching production.

`migrations/` is reserved for future versioned migrations.

## Observability

- `/api/system/health` reports database and worker status.
- `/api/system/stats` reports public corpus counts.
- **Admin -> Audit** records authentication, upload, correction, activation, deletion, settings, and evaluation actions with client IP where available.
- Application logs go to the process output. Keep them and rotate them at the reverse proxy or process manager.

## Known limitations

- SQLite and JSON embeddings are suitable for a small LGU corpus, not for high-concurrency or very large collections. PostgreSQL with a vector index is a documented future path but is not implemented or tested here.
- OCR quality depends on scan quality and Tesseract language data.
- Section parsing is heuristic. Unusual layouts need manual review.
- PDF page links rely on the viewer honoring `#page=N`.
- Search rate limits and worker coordination are process-local.
- No automated backup scheduler, password reset, or multi-factor authentication is included.
