@echo off
REM Launcher to start both the lightweight Python OCR service and the Next.js Frontend
echo ===================================================
echo Starting Local Ordinance Retrieval System...
echo ===================================================

REM Terminal 1: Lightweight Backend Service
start "Backend OCR & Embeddings" cmd /k "cd backend && call .venv\Scripts\activate.bat && python -m uvicorn app.main:app --reload --port 8000"

REM Terminal 2: Next.js Frontend
start "Next.js Frontend" cmd /k "cd frontend && npm run dev"

echo Services launched!
echo Access the application at: http://localhost:3000
echo Administration Portal at:  http://localhost:3000/login
pause
