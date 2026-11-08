"""
Context-Aware Bilingual (English + Filipino/Tagalog) Legal OCR Post-Processing,
Phrase & Spell Reconstruction, Signature Redaction, and Structural Formatting Helper.
"""

from __future__ import annotations

import logging
import re
import unicodedata
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# 1. Unicode, Ligature, and Control Character Normalization
# ---------------------------------------------------------------------------
LIGATURE_TRANSLATION = str.maketrans(
    {
        "ﬀ": "ff",
        "ﬁ": "fi",
        "ﬂ": "fl",
        "ﬃ": "ffi",
        "ﬄ": "ffl",
        "ﬅ": "ft",
        "ﬆ": "st",
        "\u2018": "'",
        "\u2019": "'",
        "\u201a": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u201e": '"',
        "\u2013": "–",
        "\u2014": "—",
        "\u00a0": " ",
        "\u2022": "•",
        "¬": "-",
        "«": '"',
        "»": '"',
    }
)

CONTROL_CHARS_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f\u200b\u200c\u200d\ufeff\ufffd]")
HYPHEN_LINEBREAK_RE = re.compile(r"(?<=[A-Za-zÑñ])-\s*\n\s*(?=[a-zñ])")
MULTI_SPACE_RE = re.compile(r"[ \t]+")
MULTI_NEWLINE_RE = re.compile(r"\n{3,}")

# ---------------------------------------------------------------------------
# 2. Scanner Noise, Page Numbers & Privacy-Sensitive Signature Line Stripping
# ---------------------------------------------------------------------------
NOISE_LINE_RE = re.compile(
    r"^\s*(?:"
    r"[-=_~*|.^]{3,}|"
    r"page\s+\d+\s*(?:of\s+\d+)?|"
    r"pahina\s+\d+\s*(?:ng\s+\d+)?|"
    r"-\s*\d+\s*-|"
    r"\[\s*(?:stamp|seal|signature|signed|initial|initials)\s*\]"
    r")\s*$",
    re.IGNORECASE,
)

# Redact inline physical signature markers (e.g., "(SGD.)", "SGD.", "Signed by:") for privacy
SGD_PREFIX_RE = re.compile(
    r"\b(?:\(\s*S\.?G\.?D\.?\s*\)|S\.?G\.?D\.?\s*:?)\s*",
    re.IGNORECASE,
)

# Spaced-out structural headers produced by typewriters / OCR (e.g. "S E C T I O N")
SPACED_KEYWORDS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"\bS\s+E\s+C\s+T\s+I\s+O\s+N\b", re.IGNORECASE), "SECTION"),
    (re.compile(r"\bS\s+E\s+K\s+S\s+I\s+Y\s+O\s+N\b", re.IGNORECASE), "SEKSIYON"),
    (re.compile(r"\bW\s+H\s+E\s+R\s+E\s+A\s+S\b", re.IGNORECASE), "WHEREAS"),
    (re.compile(r"\bS\s+A\s+P\s+A\s+G\s+K\s+A\s+T\b", re.IGNORECASE), "SAPAGKAT"),
    (re.compile(r"\bO\s+R\s+D\s+I\s+N\s+A\s+N\s+C\s+E\b", re.IGNORECASE), "ORDINANCE"),
    (re.compile(r"\bK\s+A\s+U\s+T\s+U\s+S\s+A\s+N\b", re.IGNORECASE), "KAUTUSAN"),
    (re.compile(r"\bR\s+E\s+S\s+O\s+L\s+U\s+T\s+I\s+O\s+N\b", re.IGNORECASE), "RESOLUTION"),
    (re.compile(r"\bA\s+R\s+T\s+I\s+C\s+L\s+E\b", re.IGNORECASE), "ARTICLE"),
    (re.compile(r"\bA\s+R\s+T\s+I\s+K\s+U\s+L\s+O\b", re.IGNORECASE), "ARTIKULO"),
    (re.compile(r"\bC\s+H\s+A\s+P\s+T\s+E\s+R\b", re.IGNORECASE), "CHAPTER"),
    (re.compile(r"\bK\s+A\s+B\s+A\s+N\s+A\s+T\s+A\b", re.IGNORECASE), "KABANATA"),
]

# ---------------------------------------------------------------------------
# 3. Context-Aware Split-Word & Multi-Word Phrase Reconstruction (EN + FIL)
# ---------------------------------------------------------------------------
# Repairs words split mid-stem by OCR whitespace or damaged multi-word legal idioms.
CONTEXTUAL_PHRASE_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    # Broken Filipino compound/legal stems
    (re.compile(r"\bSang\s+guniang\b", re.IGNORECASE), "Sangguniang"),
    (re.compile(r"\bPan\s+lungsod\b", re.IGNORECASE), "Panlungsod"),
    (re.compile(r"\bPan\s+lalawigan\b", re.IGNORECASE), "Panlalawigan"),
    (re.compile(r"\bBa\s+rangay\b", re.IGNORECASE), "Barangay"),
    (re.compile(r"\bMuni\s+sipalidad\b", re.IGNORECASE), "Munisipalidad"),
    (re.compile(r"\bLala\s+wigan\b", re.IGNORECASE), "Lalawigan"),
    (re.compile(r"\bipina\s+gbabawal\b", re.IGNORECASE), "ipinagbabawal"),
    (re.compile(r"\bipinag\s+babawal\b", re.IGNORECASE), "ipinagbabawal"),
    (re.compile(r"\bipina\s+tutupad\b", re.IGNORECASE), "ipinatutupad"),
    (re.compile(r"\bipinag\s*-\s*uutos\b", re.IGNORECASE), "ipinag-uutos"),
    (re.compile(r"\bpama\s+halaan\b", re.IGNORECASE), "pamahalaan"),
    (re.compile(r"\bpamaha\s+laang\b", re.IGNORECASE), "pamahalaang"),
    (re.compile(r"\bmama\s+mayan\b", re.IGNORECASE), "mamamayan"),
    (re.compile(r"\bkapa\s+ligiran\b", re.IGNORECASE), "kapaligiran"),
    (re.compile(r"\bkali\s+nisan\b", re.IGNORECASE), "kalinisan"),
    (re.compile(r"\bkalu\s+sugan\b", re.IGNORECASE), "kalusugan"),
    (re.compile(r"\bkata\s+himikan\b", re.IGNORECASE), "katahimikan"),
    (re.compile(r"\bpagka\s+kakulong\b", re.IGNORECASE), "pagkakakulong"),
    (re.compile(r"\bpag\s+kakakulong\b", re.IGNORECASE), "pagkakakulong"),
    (re.compile(r"\bkapasi\s+yahan\b", re.IGNORECASE), "kapasiyahan"),
    (re.compile(r"\bkau\s+tusan\b", re.IGNORECASE), "kautusan"),
    (re.compile(r"\bkau\s+tusang\b", re.IGNORECASE), "kautusang"),
    (re.compile(r"\balitun\s+tunin\b", re.IGNORECASE), "alituntunin"),
    (re.compile(r"\balin\s+sunod\b", re.IGNORECASE), "alinsunod"),
    (re.compile(r"\bitina\s+takda\b", re.IGNORECASE), "itinatakda"),
    (re.compile(r"\bnasa\s+sakupan\b", re.IGNORECASE), "nasasakupan"),
    (re.compile(r"\bpampub\s+liko\b", re.IGNORECASE), "pampubliko"),
    (re.compile(r"\bpampub\s+likong\b", re.IGNORECASE), "pampublikong"),
    (re.compile(r"\brehis\s+trasyon\b", re.IGNORECASE), "rehistrasyon"),
    # Broken English legal stems
    (re.compile(r"\bOrdi\s+nance\b", re.IGNORECASE), "Ordinance"),
    (re.compile(r"\bReso\s+lution\b", re.IGNORECASE), "Resolution"),
    (re.compile(r"\bMuni\s+cipality\b", re.IGNORECASE), "Municipality"),
    (re.compile(r"\bMuni\s+cipal\b", re.IGNORECASE), "Municipal"),
    (re.compile(r"\bGovern\s+ment\b", re.IGNORECASE), "Government"),
    (re.compile(r"\bProvi\s+sions?\b", re.IGNORECASE), "Provisions"),
    (re.compile(r"\bVio\s+lation\b", re.IGNORECASE), "Violation"),
    (re.compile(r"\bImpri\s+sonment\b", re.IGNORECASE), "Imprisonment"),
    (re.compile(r"\bEstab\s+lishment\b", re.IGNORECASE), "Establishment"),
    (re.compile(r"\bJuris\s+diction\b", re.IGNORECASE), "Jurisdiction"),
    (re.compile(r"\bAdminis\s+trative\b", re.IGNORECASE), "Administrative"),
    (re.compile(r"\bImple\s+mentation\b", re.IGNORECASE), "Implementation"),
    (re.compile(r"\bEnviron\s+ment\b", re.IGNORECASE), "Environment"),
    (re.compile(r"\bSani\s+tation\b", re.IGNORECASE), "Sanitation"),
    (re.compile(r"\bRegis\s+tration\b", re.IGNORECASE), "Registration"),
    (re.compile(r"\bSepara\s+bility\b", re.IGNORECASE), "Separability"),
    (re.compile(r"\bEffec\s+tivity\b", re.IGNORECASE), "Effectivity"),
    # Multi-word legal collocations & idioms
    (re.compile(r"\bRepub[l1i]ic\s+0f\s+the\s+Phi[l1i]ippines\b", re.IGNORECASE), "Republic of the Philippines"),
    (re.compile(r"\bRepub[l1i]ika\s+n[gq]\s+Pi[l1i]ipinas\b", re.IGNORECASE), "Republika ng Pilipinas"),
    (re.compile(r"\bBe\s+1t\s+enacted\b", re.IGNORECASE), "Be it enacted"),
    (re.compile(r"\bBe\s+1t\s+ordained\b", re.IGNORECASE), "Be it ordained"),
    (re.compile(r"\bNow\s*,?\s*theref0re\b", re.IGNORECASE), "Now, therefore"),
    (re.compile(r"\bSerles\s+of\s+((?:19|20)\d{2})\b", re.IGNORECASE), r"Series of \1"),
    (re.compile(r"\bSeries\s+0f\s+((?:19|20)\d{2})\b", re.IGNORECASE), r"Series of \1"),
    (re.compile(r"\bfine\s+0f\s+not\s+1ess\s+than\b", re.IGNORECASE), "fine of not less than"),
    (re.compile(r"\bin\s+acc0rdance\s+with\b", re.IGNORECASE), "in accordance with"),
]

# ---------------------------------------------------------------------------
# 4. Bilingual (English + Filipino/Tagalog) Legal & Civic OCR Dictionary
# ---------------------------------------------------------------------------
OCR_WORD_CORRECTIONS: dict[str, str] = {
    # --- English Legal & Municipal Terms ---
    "0rdinance": "ordinance",
    "ordlnance": "ordinance",
    "ord1nance": "ordinance",
    "ordinanee": "ordinance",
    "ordinancc": "ordinance",
    "ordmance": "ordinance",
    "ordnance": "ordinance",
    "ordinaces": "ordinances",
    "ordlnances": "ordinances",
    "resolutlon": "resolution",
    "resolut1on": "resolution",
    "resoiution": "resolution",
    "reso1ution": "resolution",
    "resolutlons": "resolutions",
    "sectlon": "section",
    "sect1on": "section",
    "secticn": "section",
    "5ection": "section",
    "seetion": "section",
    "secrion": "section",
    "saction": "section",
    "sectlons": "sections",
    "artlcle": "article",
    "art1cle": "article",
    "artlele": "article",
    "wherreas": "whereas",
    "whereaas": "whereas",
    "whercas": "whereas",
    "vvhereas": "whereas",
    "wherea5": "whereas",
    "thercfore": "therefore",
    "thereforc": "therefore",
    "thcrefore": "therefore",
    "republlc": "republic",
    "repub1ic": "republic",
    "repubiic": "republic",
    "phllippines": "Philippines",
    "phi1ippines": "Philippines",
    "philipplnes": "Philippines",
    "philipp1nes": "Philippines",
    "phiiippines": "Philippines",
    "munlcipal": "municipal",
    "mun1cipal": "municipal",
    "municipa1": "municipal",
    "municlpal": "municipal",
    "municlpality": "municipality",
    "municipallty": "municipality",
    "mun1cipality": "municipality",
    "municipaiity": "municipality",
    "governmcnt": "government",
    "govemment": "government",
    "goverment": "government",
    "governrnent": "government",
    "provislon": "provision",
    "provis1on": "provision",
    "provlsion": "provision",
    "provislons": "provisions",
    "provlsions": "provisions",
    "provis1ons": "provisions",
    "violatlon": "violation",
    "violat1on": "violation",
    "v1olation": "violation",
    "vio1ation": "violation",
    "violatlons": "violations",
    "vio1ations": "violations",
    "pena1ty": "penalty",
    "penaltv": "penalty",
    "pena1ties": "penalties",
    "penaltles": "penalties",
    "imprlsonment": "imprisonment",
    "imprisonmcnt": "imprisonment",
    "1mprisonment": "imprisonment",
    "irnprisonment": "imprisonment",
    "estab1ishment": "establishment",
    "establlshment": "establishment",
    "estabiishment": "establishment",
    "estab1ishments": "establishments",
    "establlshments": "establishments",
    "buslness": "business",
    "bus1ness": "business",
    "busincss": "business",
    "sanltation": "sanitation",
    "san1tation": "sanitation",
    "sanitatlon": "sanitation",
    "envlronment": "environment",
    "env1ronment": "environment",
    "environmcnt": "environment",
    "environrnent": "environment",
    "envlronmental": "environmental",
    "reglstration": "registration",
    "reg1stration": "registration",
    "registratlon": "registration",
    "effectlvity": "effectivity",
    "effect1vity": "effectivity",
    "effcctivity": "effectivity",
    "separabllity": "separability",
    "separabi1ity": "separability",
    "repeallng": "repealing",
    "repea1ing": "repealing",
    "adm1nistrative": "administrative",
    "admlnistrative": "administrative",
    "adrninistrative": "administrative",
    "implementatlon": "implementation",
    "imp1ementation": "implementation",
    "impiementation": "implementation",
    "irnplementation": "implementation",
    "jur1sdiction": "jurisdiction",
    "jurlsdiction": "jurisdiction",
    "jurisdlction": "jurisdiction",
    "counci1": "council",
    "councll": "council",
    "comm1ttee": "committee",
    "commlttee": "committee",
    "cornmittee": "committee",
    "publlc": "public",
    "pub1ic": "public",
    "pubiic": "public",
    "offlcial": "official",
    "off1cial": "official",
    "offlcials": "officials",
    "offlce": "office",
    "off1ce": "office",
    "certlficates": "certificates",
    "certlficate": "certificate",
    "cert1ficate": "certificate",
    "permlt": "permit",
    "perm1t": "permit",
    "permlts": "permits",
    "llcense": "license",
    "1icense": "license",
    "l1cense": "license",
    "veh1cle": "vehicle",
    "vehlcle": "vehicle",
    "vehlcles": "vehicles",
    "veh1cles": "vehicles",
    "pedestrlan": "pedestrian",
    "pedestr1an": "pedestrian",
    "prohlbited": "prohibited",
    "proh1bited": "prohibited",
    "prohibitlon": "prohibition",
    "prescrlbed": "prescribed",
    "prescr1bed": "prescribed",
    "auth0rized": "authorized",
    "authorlzed": "authorized",
    "author1zed": "authorized",
    "collectlon": "collection",
    "co1lection": "collection",
    "segregatlon": "segregation",
    "segregat1on": "segregation",
    "disposa1": "disposal",
    "dlsposal": "disposal",
    "residentlal": "residential",
    "res1dential": "residential",
    "commerclal": "commercial",
    "commerc1al": "commercial",
    "cornmercial": "commercial",
    "departrnent": "department",
    "docurnent": "document",
    "docurnents": "documents",
    "developrnent": "development",
    "inforrnation": "information",
    "arnount": "amount",
    "arnendment": "amendment",
    "cornmunity": "community",
    "corngress": "congress",
    "p0lice": "police",
    "f1ne": "fine",
    "f1nes": "fines",

    # --- Filipino / Tagalog LGU, Legal & Civic Terms ---
    "sanggunlang": "Sangguniang",
    "sanggumang": "Sangguniang",
    "sanggun1ang": "Sangguniang",
    "sanggunianq": "Sangguniang",
    "sanguniang": "Sangguniang",
    "sangunian": "Sanggunian",
    "sanggunlan": "Sanggunian",
    "panlungs0d": "Panlungsod",
    "pan1ungsod": "Panlungsod",
    "panlunsod": "Panlungsod",
    "panglungsod": "Panlungsod",
    "panlalawlgan": "Panlalawigan",
    "pan1alawigan": "Panlalawigan",
    "baranggay": "Barangay",
    "barangav": "Barangay",
    "8arangay": "Barangay",
    "banangay": "Barangay",
    "baranqay": "Barangay",
    "barang4y": "Barangay",
    "brqv": "Brgy",
    "pun0ng": "Punong",
    "kapltan": "Kapitan",
    "kap1tan": "Kapitan",
    "kalihlm": "Kalihim",
    "kal1him": "Kalihim",
    "ka1ihim": "Kalihim",
    "a1kalde": "Alkalde",
    "alka1de": "Alkalde",
    "lungs0d": "Lungsod",
    "1ungsod": "Lungsod",
    "lunqsod": "Lungsod",
    "munislpalidad": "Munisipalidad",
    "mun1sipalidad": "Munisipalidad",
    "lalawlgan": "Lalawigan",
    "1alawigan": "Lalawigan",
    "la1awigan": "Lalawigan",
    "sekslyon": "Seksiyon",
    "seks1yon": "Seksiyon",
    "seksyon": "Seksiyon",
    "artlkulo": "Artikulo",
    "art1kulo": "Artikulo",
    "kautusang": "kautusang",
    "kautusa11": "kautusan",
    "kapaslyahan": "kapasiyahan",
    "kapasiyaha11": "kapasiyahan",
    "a1ituntunin": "alituntunin",
    "alltuntunin": "alituntunin",
    "ipnagbabawal": "ipinagbabawal",
    "lpinagbabawal": "ipinagbabawal",
    "1pinagbabawal": "ipinagbabawal",
    "ipinagbabawa1": "ipinagbabawal",
    "ipinaqbabawal": "ipinagbabawal",
    "ipinag-uut0s": "ipinag-uutos",
    "lpinag-uutos": "ipinag-uutos",
    "mamamavan": "mamamayan",
    "rnamamayan": "mamamayan",
    "mamamaya11": "mamamayan",
    "pamaha1aan": "pamahalaan",
    "pamahaiaan": "pamahalaan",
    "parnahalaan": "pamahalaan",
    "pamaha1aang": "pamahalaang",
    "1okal": "lokal",
    "loka1": "lokal",
    "mu1ta": "multa",
    "rnulta": "multa",
    "pagkakaku1ong": "pagkakakulong",
    "pagkakakuiong": "pagkakakulong",
    "pag1abag": "paglabag",
    "pagiabag": "paglabag",
    "paqlabag": "paglabag",
    "lumalabag": "lumalabag",
    "1umalabag": "lumalabag",
    "tlndahan": "tindahan",
    "t1ndahan": "tindahan",
    "1ansangan": "lansangan",
    "ka1sada": "kalsada",
    "kapa1igiran": "kapaligiran",
    "kapallgiran": "kapaligiran",
    "ka1inisan": "kalinisan",
    "kallnisan": "kalinisan",
    "ka1usugan": "kalusugan",
    "kaiusugan": "kalusugan",
    "katahlmikan": "katahimikan",
    "katah1mikan": "katahimikan",
    "a1agang": "alagang",
    "rehlstrasyon": "rehistrasyon",
    "reh1strasyon": "rehistrasyon",
    "1isensya": "lisensya",
    "llsensya": "lisensya",
    "permlso": "permiso",
    "perm1so": "permiso",
    "magu1ang": "magulang",
    "paara1an": "paaralan",
    "paaratan": "paaralan",
    "pampub1iko": "pampubliko",
    "pampubllko": "pampubliko",
    "pampub1ikong": "pampublikong",
    "pampubllkong": "pampublikong",
    "prlbado": "pribado",
    "pr1bado": "pribado",
    "prlbadong": "pribadong",
    "mqa": "mga",
    "rnqa": "mga",
    "rnga": "mga",
    "anq": "ang",
    "nanq": "nang",
    "upanq": "upang",
    "kunq": "kung",
    "dahi1": "dahil",
    "dahll": "dahil",
    "1ahat": "lahat",
    "iahat": "lahat",
    "wa1ang": "walang",
    "waiang": "walang",
    "wa1a": "wala",
    "hlndi": "hindi",
    "h1ndi": "hindi",
    "hindl": "hindi",
    "maaarl": "maaari",
    "maaar1": "maaari",
    "maaarlng": "maaaring",
    "maaar1ng": "maaaring",
    "kai1angan": "kailangan",
    "kallangan": "kailangan",
    "ka1langan": "kailangan",
    "kai1angang": "kailangang",
    "kallangang": "kailangang",
    "a1insunod": "alinsunod",
    "allnsunod": "alinsunod",
    "ltinatakda": "itinatakda",
    "1tinatakda": "itinatakda",
    "itlnatakda": "itinatakda",
    "kaukulang": "kaukulang",
    "kauku1ang": "kaukulang",
    "nasasakupan": "nasasakupan",
    "pagsun0d": "pagsunod",
    "ipinatutupad": "ipinatutupad",
    "lpinatutupad": "ipinatutupad",
    "1pinatutupad": "ipinatutupad",
    "kaparusahan": "kaparusahan",
    "pangkalusugan": "pangkalusugan",
    "pangka1usugan": "pangkalusugan",
    "pangkapaligiran": "pangkapaligiran",
    "pangkapa1igiran": "pangkapaligiran",
    "pagpapatupad": "pagpapatupad",
    "paqpapatupad": "pagpapatupad",
    "pagpapataw": "pagpapataw",
    "paqpapataw": "pagpapataw",
    "mamamayang": "mamamayang",
    "rnamamayang": "mamamayang",
    "kabataan": "kabataan",
    "kabataa11": "kabataan",
    "sasakyan": "sasakyan",
    "sasakvan": "sasakyan",
}

WORD_TOKEN_RE = re.compile(r"\b([A-Za-z0-9Ññ][A-Za-z0-9Ññ\-]{1,34})\b")

# Currency OCR fixes: e.g. "Php 1,000.OO" -> "Php 1,000.00", "P5,OOO.00" -> "P5,000.00"
PESO_OCR_RE = re.compile(
    r"\b(Php|PhP|PHP|P)\s*(\d{1,3}(?:[,.\s]\d{3}|\s*[.,][0O]{3})*(?:\.[0O]{2})?)\b"
)

# Structural boundaries that should always start on a new paragraph/line when glued by OCR
INLINE_SECTION_BREAK_RE = re.compile(
    r"(?<=[.;:!”\"\)])\s+(?=(?:SECTION|SEC\.|SEKSIYON|SEKSYON|ARTICLE|ARTIKULO|CHAPTER|KABANATA)\s+[0-9IVXLCDM]+\b)",
    re.IGNORECASE,
)
INLINE_WHEREAS_BREAK_RE = re.compile(
    r"(?<=[.;:])\s+(?=(?:WHEREAS|SAPAGKAT|SAMANTALA|NOW,\s*THEREFORE|BE\s+IT\s+ENACTED|BE\s+IT\s+ORDAINED|DAHIL\s+DITO)\b)",
    re.IGNORECASE,
)
INLINE_CLAUSE_BREAK_RE = re.compile(
    r"(?<=[.;:])\s+(?=(\([a-z0-9]{1,3}\)|\b[a-z]\)|\b\d{1,2}\.\s+[A-Z]))"
)

# Detects if a line is a structural heading or list item that should NOT be joined to the previous line
STRUCTURAL_LINE_START_RE = re.compile(
    r"^\s*(?:"
    r"(?:SECTION|SEC\.?|SEKSIYON|SEKSYON|ARTICLE|ARTIKULO|CHAPTER|KABANATA|TITLE|PAMAGAT)\s+[0-9IVXLCDM]+|"
    r"(?:WHEREAS|SAPAGKAT|SAMANTALA|NOW,?\s*THEREFORE|BE\s+IT\s+(?:ENACTED|ORDAINED|RESOLVED)|DAHIL\s+DITO)\b|"
    r"(?:ORDINANCE|RESOLUTION|EXECUTIVE\s+ORDER|KAUTUSAN|KAPASIYAHAN)\s+(?:NO\.?|BLG\.?)|"
    r"AN?\s+(?:ORDINANCE|RESOLUTION|ACT)\b|"
    r"ISANG\s+(?:KAUTUSAN|KAPASIYAHAN)\b|"
    r"\(?[a-zA-Z0-9]{1,3}\)\s+|"
    r"\d{1,2}[.)]\s+|"
    r"[•\-–]\s+"
    r")",
    re.IGNORECASE,
)

VOWELS = set("aeiouAEIOU")


def _preserve_case(original: str, replacement: str) -> str:
    if original.isupper():
        return replacement.upper()
    if original[0].isupper() and original[1:].islower():
        return replacement[0].upper() + replacement[1:]
    return replacement


def _heuristic_token_repair(token: str) -> str:
    """
    Repairs OCR digit-inside-word confusions (e.g. 'c0mmunity' -> 'community',
    'regu1ation' -> 'regulation', 'paqkakakulong' -> 'pagkakakulong') when a token
    is predominantly alphabetic.
    """
    if len(token) < 4 or token.isdigit():
        return token
    # Skip tokens that look like ordinance codes, dates, or alphanumeric IDs (e.g. "2024-01", "Sec-1A", "COVID-19")
    if "-" in token or re.match(r"^\d", token) or re.search(r"\d{2,}", token):
        return token

    alpha_count = sum(ch.isalpha() for ch in token)
    digit_count = sum(ch.isdigit() for ch in token)

    # If a word has 1 digit embedded inside letters (e.g., "p0licy", "bui1ding", "wa1ang")
    if digit_count == 1 and alpha_count >= 3:
        chars = list(token)
        for i, ch in enumerate(chars):
            if ch == "0":
                chars[i] = "O" if token.isupper() else "o"
            elif ch == "1":
                if token.isupper():
                    chars[i] = "I"
                else:
                    # In Filipino/English, '1' before 'i' or after 'i' is almost always 'l' (e.g. 'kai1angan', 'bui1ding')
                    prev_ch = chars[i - 1].lower() if i > 0 else ""
                    next_ch = chars[i + 1].lower() if i + 1 < len(chars) else ""
                    if prev_ch == "i" or next_ch == "i" or prev_ch in VOWELS:
                        chars[i] = "l"
                    else:
                        chars[i] = "i"
            elif ch == "5":
                chars[i] = "S" if token.isupper() else "s"
        token = "".join(chars)

    # In Filipino words, 'q' does not occur natively except in Spanish/English loanwords before 'u' ('que', 'qui').
    # When OCR produces 'q' not followed by 'u' (e.g. 'paqlabag', 'ipinaqbabawal', 'baranqay'), it is a misread 'g'.
    if "q" in token.lower() and not re.search(r"q[uU]", token, re.IGNORECASE):
        token = re.sub(r"q", "g", token)
        token = re.sub(r"Q", "G", token)

    return token


def _replace_ocr_words(text: str) -> str:
    def _sub(match: re.Match[str]) -> str:
        word = match.group(1)
        lower = word.lower()
        target = OCR_WORD_CORRECTIONS.get(lower)
        if target is not None:
            return _preserve_case(word, target)
        repaired = _heuristic_token_repair(word)
        if repaired != word:
            target_after = OCR_WORD_CORRECTIONS.get(repaired.lower())
            if target_after is not None:
                return _preserve_case(word, target_after)
            return repaired
        return word

    return WORD_TOKEN_RE.sub(_sub, text)


def _apply_contextual_phrases(text: str) -> str:
    for pattern, replacement in CONTEXTUAL_PHRASE_PATTERNS:
        text = pattern.sub(replacement, text)
    return text


def _fix_peso_amounts(text: str) -> str:
    def _sub(match: re.Match[str]) -> str:
        prefix = match.group(1)
        amount = match.group(2).replace("O", "0").replace("o", "0").replace(" ", "")
        canon_prefix = "Php " if prefix.lower() == "php" else "P"
        return f"{canon_prefix}{amount}"

    return PESO_OCR_RE.sub(_sub, text)


def _normalize_section_headers(text: str) -> str:
    # Normalize "Sec . 1 ." or "SECTION   1 -" to "SECTION 1. "
    text = re.sub(
        r"(?m)^\s*(?:SECTION|SEC\.?)\s*(\d+[A-Za-z]?)\s*[.:\-–—]+\s*",
        r"SECTION \1. ",
        text,
        flags=re.IGNORECASE,
    )
    text = re.sub(
        r"(?m)^\s*(?:SEKSIYON|SEKSYON|SEK\.?)\s*(\d+[A-Za-z]?)\s*[.:\-–—]+\s*",
        r"SEKSIYON \1. ",
        text,
        flags=re.IGNORECASE,
    )
    return text


def _reflow_ocr_paragraphs(text: str) -> str:
    """
    Rejoins mid-sentence hard line wraps produced by PDF/OCR columns while
    preserving intentional paragraph breaks, headers, and enumerated clauses.
    """
    raw_lines = text.split("\n")
    cleaned_lines: list[str] = []
    for raw in raw_lines:
        stripped = MULTI_SPACE_RE.sub(" ", raw).strip()
        if NOISE_LINE_RE.match(stripped):
            continue
        cleaned_lines.append(stripped)

    paragraphs: list[str] = []
    current: list[str] = []

    def flush() -> None:
        if current:
            joined = " ".join(current).strip()
            # Clean spacing before punctuation
            joined = re.sub(r"\s+([,.;:!?])", r"\1", joined)
            # Ensure space after comma/semicolon/colon when followed by a letter
            joined = re.sub(r"([,;:])(?=[A-Za-zÑñ])", r"\1 ", joined)
            paragraphs.append(joined)
            current.clear()

    for line in cleaned_lines:
        if not line:
            flush()
            continue

        # Keep bracketed context header `[Ordinance ... | Section ...]` on its own paragraph
        if line.startswith("[") and line.endswith("]"):
            flush()
            paragraphs.append(line)
            continue

        # If this line starts a new section, article, whereas, or enumerated item, start a new paragraph
        if STRUCTURAL_LINE_START_RE.match(line):
            flush()
            current.append(line)
            continue

        # If previous line looks like an ALL-CAPS title/heading and this line starts a normal sentence
        if (
            current
            and len(current) == 1
            and current[0].isupper()
            and len(current[0]) < 120
            and not current[0].endswith((",", ";"))
        ):
            flush()
            current.append(line)
            continue

        current.append(line)

    flush()
    return "\n\n".join(paragraphs)


def clean_and_format_ocr_text(text: str, *, reflow_paragraphs: bool = True) -> str:
    """
    Full context-aware OCR cleaning, bilingual (English + Filipino/Tagalog) phrase & spell
    reconstruction, signature marker redaction, and legal paragraph formatting pipeline.
    """
    if not text:
        return ""

    # 1. Unicode & ligatures
    text = text.translate(LIGATURE_TRANSLATION)
    text = unicodedata.normalize("NFKC", text)
    text = CONTROL_CHARS_RE.sub("", text)
    text = text.replace("\r\n", "\n").replace("\r", "\n")

    # 2. Redact inline physical signature markers (e.g. "(SGD.)")
    text = SGD_PREFIX_RE.sub("", text)

    # 3. Rejoin hyphenated words split across line breaks
    text = HYPHEN_LINEBREAK_RE.sub("", text)

    # 4. Repair spaced-out typewriter headers (e.g., "S E C T I O N")
    for pattern, replacement in SPACED_KEYWORDS:
        text = pattern.sub(replacement, text)

    # 5. Context-aware split-word & multi-word phrase reconstruction
    text = _apply_contextual_phrases(text)

    # 6. Bilingual (English & Filipino) dictionary + heuristic OCR word repair
    text = _replace_ocr_words(text)
    text = _fix_peso_amounts(text)

    # 7. Insert structural line breaks when OCR glued sections/clauses together
    text = INLINE_SECTION_BREAK_RE.sub("\n\n", text)
    text = INLINE_WHEREAS_BREAK_RE.sub("\n\n", text)
    text = INLINE_CLAUSE_BREAK_RE.sub("\n", text)

    # 8. Normalize Section / Seksiyon numbering headers
    text = _normalize_section_headers(text)

    # 9. Reflow broken OCR line wraps into clean legal paragraphs
    if reflow_paragraphs:
        text = _reflow_ocr_paragraphs(text)
    else:
        lines = [
            MULTI_SPACE_RE.sub(" ", line).strip()
            for line in text.split("\n")
            if not NOISE_LINE_RE.match(line.strip())
        ]
        text = MULTI_NEWLINE_RE.sub("\n\n", "\n".join(lines)).strip()

    return text.strip()


def repair_corpus_ocr_text(db: "Session") -> dict[str, int]:
    """
    Scans persisted Pages, Sections, Chunks, and Document titles in the database and applies
    the context-aware bilingual OCR spell & formatting refiner in-place so existing corpus
    records are permanently cleaned.
    """
    from app.db.models import Chunk, Document, Page, Section

    updated_pages = 0
    updated_sections = 0
    updated_chunks = 0
    updated_docs = 0

    for doc in db.query(Document).all():
        cleaned_title = clean_and_format_ocr_text(doc.title, reflow_paragraphs=False)
        if cleaned_title and cleaned_title != doc.title:
            doc.title = cleaned_title
            updated_docs += 1

    for page in db.query(Page).all():
        cleaned_norm = clean_and_format_ocr_text(page.normalized_text, reflow_paragraphs=True)
        changed = False
        if cleaned_norm != page.normalized_text:
            page.normalized_text = cleaned_norm
            changed = True
        if page.corrected_text:
            cleaned_corr = clean_and_format_ocr_text(page.corrected_text, reflow_paragraphs=True)
            if cleaned_corr != page.corrected_text:
                page.corrected_text = cleaned_corr
                changed = True
        if changed:
            updated_pages += 1

    for section in db.query(Section).all():
        cleaned_norm = clean_and_format_ocr_text(section.normalized_text, reflow_paragraphs=True)
        changed = False
        if cleaned_norm != section.normalized_text:
            section.normalized_text = cleaned_norm
            changed = True
        if section.corrected_text:
            cleaned_corr = clean_and_format_ocr_text(section.corrected_text, reflow_paragraphs=True)
            if cleaned_corr != section.corrected_text:
                section.corrected_text = cleaned_corr
                changed = True
        if section.heading:
            cleaned_head = clean_and_format_ocr_text(section.heading, reflow_paragraphs=False)
            if cleaned_head != section.heading:
                section.heading = cleaned_head
                changed = True
        if changed:
            updated_sections += 1

    for chunk in db.query(Chunk).all():
        cleaned_disp = clean_and_format_ocr_text(chunk.display_text, reflow_paragraphs=True)
        changed = False
        if cleaned_disp != chunk.display_text:
            chunk.display_text = cleaned_disp
            changed = True
        if chunk.heading:
            cleaned_head = clean_and_format_ocr_text(chunk.heading, reflow_paragraphs=False)
            if cleaned_head != chunk.heading:
                chunk.heading = cleaned_head
                changed = True
        if changed:
            updated_chunks += 1

    if updated_docs or updated_pages or updated_sections or updated_chunks:
        db.commit()
        logger.info(
            "Corpus OCR text repair completed: %d docs, %d pages, %d sections, %d chunks updated.",
            updated_docs,
            updated_pages,
            updated_sections,
            updated_chunks,
        )

    return {
        "documents_updated": updated_docs,
        "pages_updated": updated_pages,
        "sections_updated": updated_sections,
        "chunks_updated": updated_chunks,
    }
