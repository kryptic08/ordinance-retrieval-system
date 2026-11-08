@echo off
cd /d "%~dp0remotion-video"
echo Rendering 6m30s OrdiSearch Pitch Video (1080p 30fps) with Teleprompter Script...
npx remotion render src/index.tsx OrdiSearchPitch out/ordisearch-pitch.mp4
pause
