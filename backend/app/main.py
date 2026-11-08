import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes import admin, auth, documents, evaluation, search, system
from app.core.config import settings
from app.db.init_db import init_db
from app.db.models import ProcessingJob
from app.db.session import SessionLocal
from app.workers.queue import worker

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


def _recover_stale_jobs() -> None:
    with SessionLocal() as db:
        stale = db.query(ProcessingJob).filter(ProcessingJob.status == "running").all()
        for job in stale:
            if job.attempts < job.max_attempts:
                job.status = "queued"
                job.stage = "queued"
                job.logs = (job.logs or "") + f"[{datetime.now(timezone.utc).isoformat()}] Re-queued after restart\n"
            else:
                job.status = "failed"
                job.error = job.error or "Worker restarted before job completed"
        db.commit()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    from app.ingestion.ocr_helper import repair_corpus_ocr_text

    init_db()
    _recover_stale_jobs()
    try:
        with SessionLocal() as db:
            repair_corpus_ocr_text(db)
    except Exception:
        logger.debug("Startup OCR corpus repair skipped", exc_info=True)
    if settings.worker_enabled:
        worker.start()
    yield
    if settings.worker_enabled:
        worker.stop()


app = FastAPI(
    title="Local Ordinance and Policy Retrieval System",
    description=(
        "Source-grounded semantic and keyword retrieval for local ordinances and policy "
        "documents. Retrieval scores are similarity indicators, not legal certainty."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# Support CORS for local development and online deployments (Vercel, Netlify, custom domains)
is_wildcard = "*" in settings.cors_origins or not settings.cors_origins
if is_wildcard:
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"^https?://.*",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

@app.get("/health", include_in_schema=True)
@app.get("/api/health", include_in_schema=True)
async def health_check():
    return {
        "status": "healthy",
        "service": "OrdiSearch Backend",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": "connected",
    }


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
    return response


@app.exception_handler(Exception)
async def unhandled_exception(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "An internal server error occurred."})


# 1. Mount API routers under /api/v1 (canonical), /api (standard), and /backend/api (unified proxy-free compatibility)
API_ROUTERS = (auth.router, documents.router, search.router, admin.router, evaluation.router, system.router)
mounted_prefixes: set[str] = set()
for prefix in (settings.api_prefix, "/api/v1", "/api", "/backend/api", "/backend/api/v1"):
    normalized_prefix = prefix.rstrip("/")
    if not normalized_prefix or normalized_prefix in mounted_prefixes:
        continue
    mounted_prefixes.add(normalized_prefix)
    is_primary = normalized_prefix == settings.api_prefix.rstrip("/")
    for router in API_ROUTERS:
        app.include_router(router, prefix=normalized_prefix, include_in_schema=is_primary)


# 2. Production Static Asset Mounting & SPA HTML5 History PushState Routing
static_dir = Path(settings.static_path)
index_html = static_dir / "index.html"

if static_dir.exists() and index_html.is_file():
    static_root = static_dir.resolve()
    logger.info("Serving production static frontend from: %s", static_root)

    # Mount static assets if _next directory exists
    next_dir = static_root / "_next"
    if next_dir.is_dir():
        app.mount("/_next", StaticFiles(directory=next_dir), name="next_static")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(request: Request, full_path: str):
        clean_path = full_path.strip("/")
        if (
            clean_path == "api"
            or clean_path.startswith("api/")
            or clean_path == "backend"
            or clean_path.startswith("backend/")
            or clean_path in {"docs", "redoc", "openapi.json"}
        ):
            return JSONResponse(status_code=404, content={"detail": "API endpoint not found"})

        if not clean_path:
            return FileResponse(index_html)

        # Resolve and enforce directory confinement to prevent path traversal
        candidate = (static_root / clean_path).resolve()
        if static_root not in candidate.parents and candidate != static_root:
            return JSONResponse(status_code=404, content={"detail": "Not found"})

        if candidate.is_file():
            return FileResponse(candidate)

        html_candidate = candidate.with_suffix(".html")
        if static_root in html_candidate.parents and html_candidate.is_file():
            return FileResponse(html_candidate)

        nested_index = candidate / "index.html"
        if static_root in nested_index.parents and nested_index.is_file():
            return FileResponse(nested_index)

        # Support Next.js static export dynamic route shells (e.g., /documents/[id] -> /documents/index.html)
        parent_shell = candidate.parent / "index.html"
        if static_root in parent_shell.parents and parent_shell != index_html and parent_shell.is_file():
            return FileResponse(parent_shell)

        # Catch-all SPA fallback: return index.html for client-side pushState routing
        return FileResponse(index_html)
else:
    logger.info("Static directory '%s' not built yet; serving API root metadata.", static_dir)

    @app.get("/", include_in_schema=False)
    def root():
        return {
            "service": settings.app_name,
            "docs": "/docs",
            "health": f"{settings.api_prefix}/system/health",
        }
