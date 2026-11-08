const fs = require("fs");
const path = require("path");

const VOICEBOX_URL = "http://127.0.0.1:17493";
const PROFILE_ID = "13c56b75-16a9-42c5-9673-c4e033165025"; // "ME" cloned voice profile
const OUT_DIR = path.join(__dirname, "remotion-video", "public", "audio");

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const SCENES = [
  {
    key: "scene1_intro",
    file: "scene1_intro.wav",
    text: "In the first-class Municipality of Polangui, Albay, local ordinances and resolutions enacted by the Sangguniang Bayan govern public safety, commerce, zoning, and environmental health. Yet finding the exact legal clause across hundreds of multi-page PDF archives remains a major operational challenge. Good day! We are researchers Kirby Cope, Arnel Hapin, and James Nebria. In partnership with the Office of the Secretary to the Sangguniang Bayan of Polangui, we proudly present OrdiSearch: A Vector Search-Based Local Ordinance and Policy Retrieval System.",
  },
  {
    key: "scene2_problem",
    file: "scene2_problem.wav",
    text: "Why do traditional search tools fail in local government offices? The core issue is lexical mismatch. When a citizen or staff member searches in everyday language, such as 'Are businesses allowed to operate after midnight?', traditional keyword search looks strictly for the word midnight. If the enacted ordinance is formally codified as 'permitted commercial operating hours and nighttime trade restrictions', keyword search returns zero results. Staff spend hours manually scrolling through scanned PDFs, while generic AI chatbots risk hallucinating fake laws. Polangui needed a strictly extractive, source-grounded retrieval engine.",
  },
  {
    key: "scene3_sig_obj",
    file: "scene3_sig_obj.wav",
    text: "OrdiSearch brings transformative value across four levels. For the Office of the Secretary to the Sangguniang Bayan, it drastically cuts down manual search time using conversational queries. For LGU Officials and Lawmakers, it provides rapid policy verification before issuing permits or drafting new laws. For Local Chief Executives, it delivers a zero-cost, CPU-friendly modernization model. And for Policy and AI Researchers, it provides empirical benchmarks on Philippine municipal legal text. Our study fulfills three specific objectives: First, determine the document, metadata, and query requirements of the Sangguniang Bayan. Second, design and develop a section-aware vector search pipeline that returns exact statutory excerpts with ordinance titles, sections, and page numbers. And third, evaluate retrieval accuracy and software quality under the ISO IEC 25010 standard.",
  },
  {
    key: "scene4_methodology",
    file: "scene4_methodology.wav",
    text: "To build OrdiSearch, we adopted the Rapid Application Development methodology, iterating through Requirements Planning, User Design Prototyping, Construction, and Cutover alongside municipal staff. Architecturally, OrdiSearch uses a clean Three-Tier Design. The Presentation Layer is built with Next.js 15, React 19, and Tailwind CSS, offering both a public search portal and a custodial admin console. The Application Layer runs on Python and FastAPI, featuring a dual pipeline: Document Ingestion extracts text via PyMuPDF and bilingual Tesseract OCR, segments hierarchical sections, isolates signatures, and embeds chunks into 384-dimensional vectors using FastEmbed BGE-small. Meanwhile, the Hybrid Retrieval engine fuses SQLite FTS5 BM25 keyword scores with dense cosine similarity. Finally, the Data Layer stores versioned sections, audit logs, and reactive Convex cloud state.",
  },
  {
    key: "scene5_walkthrough",
    file: "scene5_walkthrough.wav",
    text: "Let us walk through the actual OrdiSearch system. On the clean light-mode public portal, users see the official Polangui seal, live corpus counters, and sample citizen inquiries. When we ask, 'What are the curfew hours and exemptions for minors?', OrdiSearch processes the query in under 120 milliseconds. Instead of generating unverified free text, it synthesizes a source-grounded answer with interactive citation badges. Clicking Citation 1 opens the Live Parsed Section Inspector right on screen, highlighting Section 4 of Municipal Ordinance Number 2021-08 on Page 3. Next, switching to the OrdiSearch Admin Portal, the Sangguniang Bayan custodian monitors active ordinances, OCR review queues, indexed vector chunks, and signatory isolation. From the Evaluation tab, administrators can run live benchmark experiments comparing Keyword, Vector, Hybrid, and Reranked configurations.",
  },
  {
    key: "scene6_evaluation",
    file: "scene6_evaluation.wav",
    text: "We rigorously evaluated OrdiSearch using two empirical instruments. First, using our Relevance Judgment Matrix across annotated municipal test queries, the Hybrid Vector and BM25 configuration achieved 92.4 percent Precision at K, a 0.78 Mean Reciprocal Rank, and a 0.85 Normalized Discounted Cumulative Gain, with 100 percent citation accuracy and sub-150 millisecond CPU latency. Second, in user evaluations conducted with Sangguniang Bayan personnel and IT experts using the ISO IEC 25010 quality model, OrdiSearch earned Excellent weighted mean scores across Functional Suitability, Interaction Capability, Performance Efficiency, and Reliability.",
  },
  {
    key: "scene7_conclusion",
    file: "scene7_conclusion.wav",
    text: "OrdiSearch proves that artificial intelligence in local government does not need to hallucinate or replace human legal authority. By combining dense vector embeddings with strict statutory citations, we make municipal legislation transparent, accessible, and verifiable for everyone. On behalf of researchers Kirby Cope, Arnel Hapin, and James Nebria, thank you for watching our presentation of OrdiSearch.",
  },
];

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForActiveTasks() {
  while (true) {
    const res = await fetch(`${VOICEBOX_URL}/tasks/active`);
    if (res.ok) {
      const data = await res.json();
      const tasks = Array.isArray(data) ? data : data.tasks || data.items || [];
      if (tasks.length === 0) break;
      console.log(`Waiting for ${tasks.length} active Voicebox task(s) to finish...`);
    } else {
      break;
    }
    await sleep(3000);
  }
}

async function generateSceneAudio(scene) {
  const destPath = path.join(OUT_DIR, scene.file);
  if (fs.existsSync(destPath) && fs.statSync(destPath).size > 200000) {
    console.log(`[SKIP] ${scene.file} already exists (${fs.statSync(destPath).size} bytes)`);
    return;
  }

  console.log(`\n=== Generating ${scene.key} ===`);
  await waitForActiveTasks();

  const res = await fetch(`${VOICEBOX_URL}/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Voicebox-Client-Id": "claude-code",
    },
    body: JSON.stringify({
      profile_id: PROFILE_ID,
      text: scene.text,
      language: "en",
      engine: "chatterbox",
      max_chunk_chars: 350,
      crossfade_ms: 50,
      normalize: true,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to start generation for ${scene.key}: ${res.status} ${errText}`);
  }

  const job = await res.json();
  console.log(`Started generation ID: ${job.id}`);

  while (true) {
    await sleep(3000);
    const statusRes = await fetch(`${VOICEBOX_URL}/history/${job.id}`);
    if (!statusRes.ok) continue;
    const item = await statusRes.json();
    console.log(`  [${scene.key}] status=${item.status} duration=${item.duration || 0}s`);
    if (item.status === "completed") {
      const audioRes = await fetch(`${VOICEBOX_URL}/audio/${job.id}`);
      if (!audioRes.ok) throw new Error(`Failed to download audio for ${job.id}`);
      const arrayBuffer = await audioRes.arrayBuffer();
      fs.writeFileSync(destPath, Buffer.from(arrayBuffer));
      console.log(`  [SAVED] ${destPath} (${Buffer.byteLength(Buffer.from(arrayBuffer))} bytes, ${item.duration}s)`);
      break;
    } else if (item.status === "failed") {
      throw new Error(`Generation failed for ${scene.key}: ${item.error}`);
    }
  }
}

async function main() {
  try {
    for (const scene of SCENES) {
      await generateSceneAudio(scene);
    }
    console.log("\nAll 7 Voicebox cloned narration tracks generated successfully!");
  } catch (err) {
    console.error("Error in TTS pipeline:", err);
    process.exit(1);
  }
}

main();
