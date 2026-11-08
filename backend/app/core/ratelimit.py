import threading
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request

from app.core.config import settings

_lock = threading.Lock()
_buckets: dict[str, deque[float]] = defaultdict(deque)


def enforce_search_rate_limit(request: Request) -> None:
    limit = settings.rate_limit_search_per_minute
    if limit <= 0:
        return
    client = request.client.host if request.client else "unknown"
    now = time.monotonic()
    with _lock:
        bucket = _buckets[client]
        while bucket and now - bucket[0] > 60:
            bucket.popleft()
        if len(bucket) >= limit:
            raise HTTPException(status_code=429, detail="Too many search requests. Please wait a moment.")
        bucket.append(now)
