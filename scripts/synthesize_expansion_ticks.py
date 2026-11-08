import os
import json
import time
import urllib.request

OMNIVOICE_URL = "http://127.0.0.1:3900"
PROFILE_ID = "be77634a"  # Verified "Me" profile
RAW_DIR = os.path.abspath(r"remotion-video\public\voiceover\raw")
os.makedirs(RAW_DIR, exist_ok=True)

EXPANSION_TICKS = [
    ("problem_new_archive_burden.wav",
     "Before this study, personnel at the Office of the Secretary to the Sang-goo-nee-ang Ba-yan had to manually inspect extensive physical ordinance files, facing significant delays because keyword searches cannot bridge everyday natural language with legal terminology."),
    ("literature_new_sovereignty.wav",
     "D-I-L-G circular twenty twenty-six zero forty-one demonstrates that while national repositories consolidate municipal policies, local government units require specialized, autonomous retrieval tools optimized for rapid municipal staff verification."),
    ("literature_new_chunking.wav",
     "Roque's findings proved that splitting statutory provisions along legislative boundaries, such as preambles, articles, and specific subsections, outperforms fine-tuning larger models on synthetic data."),
    ("methodology_new_bilingual_stem.wav",
     "Our Application Layer incorporates bilingual synonym expansion and legal stem normalization, ensuring that queries phrased in Filipino or conversational English accurately map to formal statutory clauses."),
    ("evaluation_new_subcharacteristics.wav",
     "Under I-S-O twenty-five zero ten, Functional Suitability was rated across functional completeness, correctness, and appropriateness, while administrative staff confirmed high usability and learnability for non-technical users."),
    ("walkthrough_new_intake.wav",
     "In the Admin Ingestion pipeline, municipal officers review O-C-R confidence scores, verify automatically isolated signatory blocks, and publish newly enacted ordinances into the live vector database in seconds."),
]

def synthesize(filename, tts_text):
    out_path = os.path.join(RAW_DIR, filename)
    if os.path.exists(out_path):
        print(f"  [Cached] {filename} already exists ({os.path.getsize(out_path)} bytes)")
        return
    print(f"  [Synthesizing] {filename} ...")
    payload = {
        "model": "omnivoice",
        "input": tts_text,
        "voice": PROFILE_ID,
        "response_format": "wav",
        "speed": 1.03,
        "num_step": 16,
    }
    req = urllib.request.Request(
        f"{OMNIVOICE_URL}/v1/audio/speech",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    t0 = time.time()
    with urllib.request.urlopen(req, timeout=180) as resp:
        data = resp.read()
    elapsed = time.time() - t0
    with open(out_path, "wb") as f:
        f.write(data)
    print(f"  [Done] {filename} ({len(data)} bytes in {elapsed:.1f}s)")

if __name__ == "__main__":
    print(f"=== Synthesizing {len(EXPANSION_TICKS)} Expansion Ticks for 10+ Minute Presentation ===")
    for fn, text in EXPANSION_TICKS:
        synthesize(fn, text)
    print("=== All Expansion Ticks Ready! ===")
