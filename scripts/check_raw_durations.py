import wave, glob, os

raw_files = sorted(glob.glob("remotion-video/public/voiceover/raw/*.wav"))
for f in raw_files:
    try:
        with wave.open(f, "rb") as w:
            sec = w.getnframes() / w.getframerate()
            print(f"{os.path.basename(f)}: {sec:.2f}s ({w.getnframes()} frames, {w.getframerate()}Hz)")
    except Exception as e:
        print(f"Error {f}: {e}")
