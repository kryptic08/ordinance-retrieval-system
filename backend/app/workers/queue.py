import logging
import threading
import time

from app.core.config import settings
from app.db.models import ProcessingJob
from app.db.session import SessionLocal
from app.ingestion.pipeline import process_job_by_id

logger = logging.getLogger(__name__)


class Worker:
    def __init__(self) -> None:
        self._thread: threading.Thread | None = None
        self._stop = threading.Event()

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop.clear()
        self._thread = threading.Thread(target=self._run, name="ingestion-worker", daemon=True)
        self._thread.start()
        logger.info("Background ingestion worker started")

    def stop(self) -> None:
        self._stop.set()
        if self._thread:
            self._thread.join(timeout=5)

    def _next_job_id(self) -> str | None:
        with SessionLocal() as db:
            job = (
                db.query(ProcessingJob)
                .filter(
                    ProcessingJob.status.in_(["queued", "failed"]),
                    ProcessingJob.attempts < ProcessingJob.max_attempts,
                )
                .order_by(ProcessingJob.created_at)
                .first()
            )
            return job.id if job else None

    def _run(self) -> None:
        while not self._stop.is_set():
            try:
                job_id = self._next_job_id()
                if job_id:
                    process_job_by_id(job_id)
                    continue
            except Exception:
                logger.exception("Worker loop error")
            self._stop.wait(settings.worker_poll_seconds)


worker = Worker()
