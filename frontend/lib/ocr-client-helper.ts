/**
 * Client-side Context-Aware Bilingual (English + Filipino/Tagalog) OCR Spell & Layout Refiner.
 * Works alongside the backend `ocr_helper.py` to guarantee clean, readable statutory text.
 */

const CONTEXT_PHRASES: Array<[RegExp, string]> = [
  [/\bS\s+E\s+C\s+T\s+I\s+O\s+N\b/gi, "SECTION"],
  [/\bS\s+E\s+K\s+S\s+I\s+Y\s+O\s+N\b/gi, "SEKSIYON"],
  [/\bW\s+H\s+E\s+R\s+E\s+A\s+S\b/gi, "WHEREAS"],
  [/\bS\s+A\s+P\s+A\s+G\s+K\s+A\s+T\b/gi, "SAPAGKAT"],
  [/\bO\s+R\s+D\s+I\s+N\s+A\s+N\s+C\s+E\b/gi, "ORDINANCE"],
  [/\bR\s+E\s+S\s+O\s+L\s+U\s+T\s+I\s+O\s+N\b/gi, "RESOLUTION"],
  [/\bSang\s+guniang\b/gi, "Sangguniang"],
  [/\bPan\s+lungsod\b/gi, "Panlungsod"],
  [/\bPan\s+lalawigan\b/gi, "Panlalawigan"],
  [/\bBa\s+rangay\b/gi, "Barangay"],
  [/\bMuni\s+sipalidad\b/gi, "Munisipalidad"],
  [/\bipina\s+gbabawal\b/gi, "ipinagbabawal"],
  [/\bipinag\s+babawal\b/gi, "ipinagbabawal"],
  [/\bpama\s+halaan\b/gi, "pamahalaan"],
  [/\bmama\s+mayan\b/gi, "mamamayan"],
  [/\bkapa\s+ligiran\b/gi, "kapaligiran"],
  [/\bpagka\s+kakulong\b/gi, "pagkakakulong"],
  [/\bOrdi\s+nance\b/gi, "Ordinance"],
  [/\bReso\s+lution\b/gi, "Resolution"],
  [/\bMuni\s+cipality\b/gi, "Municipality"],
  [/\bGovern\s+ment\b/gi, "Government"],
  [/\b(?:\(\s*S\.?G\.?D\.?\s*\)|S\.?G\.?D\.?\s*:?)\s*/gi, ""],
];

const WORD_MAP: Record<string, string> = {
  "0rdinance": "ordinance",
  ordlnance: "ordinance",
  ord1nance: "ordinance",
  ordinanee: "ordinance",
  ordinancc: "ordinance",
  resolutlon: "resolution",
  resolut1on: "resolution",
  sectlon: "section",
  sect1on: "section",
  secticn: "section",
  "5ection": "section",
  artlcle: "article",
  art1cle: "article",
  wherreas: "whereas",
  whercas: "whereas",
  vvhereas: "whereas",
  republlc: "republic",
  repub1ic: "republic",
  phllippines: "Philippines",
  phi1ippines: "Philippines",
  philipplnes: "Philippines",
  munlcipal: "municipal",
  mun1cipal: "municipal",
  municlpality: "municipality",
  municipallty: "municipality",
  governmcnt: "government",
  govemment: "government",
  governrnent: "government",
  provislon: "provision",
  provis1on: "provision",
  provislons: "provisions",
  violatlon: "violation",
  violat1on: "violation",
  pena1ty: "penalty",
  penaltles: "penalties",
  imprlsonment: "imprisonment",
  irnprisonment: "imprisonment",
  estab1ishment: "establishment",
  establlshment: "establishment",
  sanggunlang: "Sangguniang",
  sanggumang: "Sangguniang",
  sanggun1ang: "Sangguniang",
  sanggunianq: "Sangguniang",
  panlungs0d: "Panlungsod",
  pan1ungsod: "Panlungsod",
  panlunsod: "Panlungsod",
  baranggay: "Barangay",
  barangav: "Barangay",
  baranqay: "Barangay",
  kapltan: "Kapitan",
  kalihlm: "Kalihim",
  a1kalde: "Alkalde",
  lungs0d: "Lungsod",
  "1ungsod": "Lungsod",
  sekslyon: "Seksiyon",
  seks1yon: "Seksiyon",
  ipnagbabawal: "ipinagbabawal",
  lpinagbabawal: "ipinagbabawal",
  ipinaqbabawal: "ipinagbabawal",
  mamamavan: "mamamayan",
  rnamamayan: "mamamayan",
  pamaha1aan: "pamahalaan",
  parnahalaan: "pamahalaan",
  mu1ta: "multa",
  rnulta: "multa",
  pagkakaku1ong: "pagkakakulong",
  pag1abag: "paglabag",
  paqlabag: "paglabag",
  kapa1igiran: "kapaligiran",
  ka1inisan: "kalinisan",
  ka1usugan: "kalusugan",
  pampub1iko: "pampubliko",
  pampubllko: "pampubliko",
  mqa: "mga",
  rnga: "mga",
  anq: "ang",
  nanq: "nang",
  upanq: "upang",
  kunq: "kung",
  dahi1: "dahil",
  "1ahat": "lahat",
  wa1ang: "walang",
  hlndi: "hindi",
  h1ndi: "hindi",
  maaarl: "maaari",
  maaarlng: "maaaring",
  kai1angan: "kailangan",
  kallangan: "kailangan",
  a1insunod: "alinsunod",
  ltinatakda: "itinatakda",
};

function preserveCase(source: string, target: string): string {
  if (source === source.toUpperCase()) return target.toUpperCase();
  if (source[0] === source[0].toUpperCase() && source.slice(1) === source.slice(1).toLowerCase()) {
    return target[0].toUpperCase() + target.slice(1);
  }
  return target;
}

export function refineLegalText(raw: string): string {
  if (!raw) return "";
  let text = raw;
  for (const [pattern, replacement] of CONTEXT_PHRASES) {
    text = text.replace(pattern, replacement);
  }
  text = text.replace(/\b([A-Za-z0-9Ññ]{2,32})\b/g, (token) => {
    const mapped = WORD_MAP[token.toLowerCase()];
    if (mapped) return preserveCase(token, mapped);
    return token;
  });
  return text;
}
