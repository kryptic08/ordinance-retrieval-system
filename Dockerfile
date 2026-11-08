# =========================================================================
# Stage 1: Build Next.js Frontend Static Assets
# =========================================================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package definitions and npm config
COPY frontend/package*.json ./
COPY frontend/.npmrc ./

# Install dependencies (respecting legacy-peer-deps for React 19)
RUN npm install --legacy-peer-deps

# Copy frontend source files
COPY frontend/ ./

# Configure build environment for production export
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_OUTPUT_MODE=export

RUN npm run build

# =========================================================================
# Stage 2: Python / FastAPI Runtime Service with OCR & Embeddings
# =========================================================================
FROM python:3.12-slim AS runtime

# System utilities, Tesseract OCR with English and Tagalog dictionaries
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-eng \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python requirements
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r ./backend/requirements.txt

# Pre-cache FastEmbed embedding model for instant container cold starts
RUN python -c "from fastembed import TextEmbedding; TextEmbedding('BAAI/bge-small-en-v1.5')" || true

# Copy backend source tree
COPY backend/ ./backend/

# Copy static frontend distribution from Stage 1 builder
COPY --from=frontend-builder /app/frontend/out ./frontend/out

# Runtime configuration
ENV PYTHONPATH=/app/backend
ENV STATIC_DIR=/app/frontend/out
ENV PORT=8000
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

# Health check against verified API health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Launch ASGI application serving both API and frontend SPA
CMD ["uvicorn", "app.main:app", "--app-dir", "backend", "--host", "0.0.0.0", "--port", "8000"]
