@echo off
cd /d "%~dp0remotion-video"
echo Starting Remotion Studio Preview Server on http://localhost:3333 ...
npx remotion preview src/index.tsx --port 3333
pause
