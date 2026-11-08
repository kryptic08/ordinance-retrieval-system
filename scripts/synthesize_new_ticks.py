import os
import json
import time
import urllib.request

OMNIVOICE_URL = "http://127.0.0.1:3900"
PROFILE_ID = "be77634a"  # User's verified "Me" voice profile
RAW_DIR = os.path.abspath(r"remotion-video\public\voiceover\raw")
os.makedirs(RAW_DIR, exist_ok=True)

# List of only the NEW ticks needed for the 10-minute master video
NEW_TICKS = [
    # Scene 3: Significance beneficiary tick
    ("significance_new_stakeholders.wav", 
     "Chapter One defines five core beneficiary groups: S-B records personnel, municipal officials, chief executives, policy researchers, and future scholars in local e-governance."),

    # Scene 4: Chapter 2 Literature & Conceptual Paradigm (8 ticks)
    ("literature_0.wav",
     "In Chapter Two, we ground our work in recent Philippine local governance literature, including Dela Peña's twenty twenty-five study in Paracale and Dandan's twenty twenty-six evaluation under I-S-O twenty-five zero ten."),
    ("literature_1.wav",
     "At the national level, D-I-L-G Memorandum Circular twenty twenty-six zero forty-one established the e-Legis platform with the Vice Mayors' League, underscoring legislative digitization as a key priority."),
    ("literature_2.wav",
     "Legal scholar Lim in twenty twenty-five demonstrated that training specialized models on Philippine law is cost-prohibitive, making Retrieval-Augmented Generation the ideal, legally sound path."),
    ("literature_3.wav",
     "Furthermore, Agpaoa and Palaoag's twenty twenty-five framework highlights evaluating municipal language systems across I-R accuracy, efficiency, user trust, and bilingual inclusivity."),
    ("literature_4.wav",
     "Among empirical studies, Roque and colleagues in twenty twenty-four tested embedding models over the Philippine Tax Code, revealing that fine-grained section chunking boosts Top-one accuracy by thirteen percent and M-R-R by point fourteen."),
    ("literature_5.wav",
     "Yet a critical research gap remained: prior local work either indexed national statutes without user applications, or relied solely on keyword search without semantic vector ranking."),
    ("literature_6.wav",
     "To address this gap, Figure One presents our Conceptual Paradigm: an Input-Process-Output model connecting municipal records, Fast Embed vectors, and I-S-O twenty-five zero ten standards through R-A-D."),
    ("literature_7.wav",
     "A continuous feedback loop ensures that experimental retrieval findings and user evaluations directly refine chunk boundaries, vector indexing, and administrative search workflows."),

    # Scene 5: Chapter 3 RAD Lifecycle tick
    ("methodology_new_rad.wav",
     "Stage One begins with Requirements Planning and User Prototyping, designing interactive mockups alongside S-B pulang-geee personnel before full-scale construction."),

    # Scene 6: Walkthrough additions (2 ticks)
    ("walkthrough_7.wav",
     "The system seamlessly understands bilingual inquiries, whether phrased in English, conversational Tagalog, or local phrasing, reliably retrieving the governing legal provisions."),
    ("walkthrough_8.wav",
     "Every returned insight is strictly extractive and fully traceable back to its enacted source, preventing hallucinations and preserving institutional legal authority."),

    # Scene 7: Chapter 3 Evaluation additions (4 ticks)
    ("evaluation_new_dual.wav",
     "To evaluate our system, Chapter Three establishes a dual framework uniting quantitative I-R accuracy with I-S-O twenty-five zero ten software quality."),
    ("evaluation_new_matrix.wav",
     "We adapted the I-R confusion matrix into a four-point Relevance Judgment Matrix, grading provisions from three for completely relevant down to zero for non-relevant."),
    ("evaluation_new_f1.wav",
     "From these judgments, we compute Precision, Recall, and the balanced harmonic mean F-one Score, accounting for imbalanced statutory collections."),
    ("evaluation_new_likert.wav",
     "Applying the statistical Weighted Mean formula, the system achieved overall ratings in the Excellent bracket between four point twenty-one and five point zero, confirming strong institutional acceptance."),
]

def synthesize_tick(filename, tts_text):
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
    print(f"=== Synthesizing {len(NEW_TICKS)} New Ticks for 10-Minute Presentation ===")
    for filename, text in NEW_TICKS:
        synthesize_tick(filename, text)
    print("=== All New Ticks Ready! ===")
