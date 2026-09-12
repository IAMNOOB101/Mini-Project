"""
clean_transcript.py
Python port of cleanTranscript.js.
Cleans speech-to-text transcriptions before saving:
 - Removes filler words (um, uh, like, you know, etc.)
 - Removes exact and near-duplicate consecutive sentences
 - Collapses excessive whitespace and punctuation artifacts
 - Fixes common STT misrecognitions
"""
import re

# ── Filler word patterns ───────────────────────────────────────────
FILLER_PATTERNS = [
    re.compile(r"\b(um+|uh+|hmm+|hm+|er+|erm+|ah+|oh+|uhh+|umm+)\b", re.IGNORECASE),
    re.compile(
        r"\b(you know(,| what I mean)?|I mean|like I said|so basically|basically|"
        r"you see|I guess|kind of|sort of|right\?|okay so|so yeah|and uh|and um|"
        r"and like|let me think|let me see|I think basically|well basically)\b",
        re.IGNORECASE,
    ),
    re.compile(r"\blike\s+like\b", re.IGNORECASE),
]

# ── STT corrections ────────────────────────────────────────────────
STT_CORRECTIONS = [
    (re.compile(r"\bJava Script\b", re.IGNORECASE), "JavaScript"),
    (re.compile(r"\bType Script\b", re.IGNORECASE), "TypeScript"),
    (re.compile(r"\bnode JS\b", re.IGNORECASE), "Node.js"),
    (re.compile(r"\bReact JS\b", re.IGNORECASE), "React.js"),
    (re.compile(r"\bmon go\b", re.IGNORECASE), "MongoDB"),
    (re.compile(r"\bpost gress\b", re.IGNORECASE), "PostgreSQL"),
    (re.compile(r"\bpost gre\b", re.IGNORECASE), "PostgreSQL"),
    (re.compile(r"\bkubernetes\b", re.IGNORECASE), "Kubernetes"),
    (re.compile(r"\bdocker\b", re.IGNORECASE), "Docker"),
    (re.compile(r"\bgit hub\b", re.IGNORECASE), "GitHub"),
    (re.compile(r"\bapi\b"), "API"),
    (re.compile(r"\bsql\b", re.IGNORECASE), "SQL"),
    (re.compile(r"\baws\b", re.IGNORECASE), "AWS"),
    (re.compile(r"\bgcp\b", re.IGNORECASE), "GCP"),
    (re.compile(r"\bai\b", re.IGNORECASE), "AI"),
    (re.compile(r"\bml\b", re.IGNORECASE), "ML"),
    (re.compile(r"\bci cd\b", re.IGNORECASE), "CI/CD"),
    (re.compile(r"\bci/cd\b", re.IGNORECASE), "CI/CD"),
    (re.compile(r"\brestful\b", re.IGNORECASE), "RESTful"),
    (re.compile(r"\brest api\b", re.IGNORECASE), "REST API"),
]


def _normalize(s: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9\s]", "", s.lower())).strip()


def _deduplicate_sentences(text: str) -> str:
    """Remove duplicate or near-duplicate consecutive sentences."""
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]
    if len(sentences) <= 1:
        return text

    kept = []
    recent_norms: list[str] = []

    for sentence in sentences:
        norm = _normalize(sentence)
        is_dupe = any(
            norm == prev or (len(norm) > 10 and len(prev) > 10 and (norm in prev or prev in norm))
            for prev in recent_norms
        )
        if not is_dupe:
            kept.append(sentence)
            recent_norms.append(norm)
            if len(recent_norms) > 4:
                recent_norms.pop(0)

    return " ".join(kept)


def _remove_repeated_words(text: str) -> str:
    return re.sub(r"\b(\w+)\s+\1\b", r"\1", text, flags=re.IGNORECASE)


def clean_transcript(raw_text: str) -> str:
    """
    Main clean function.
    Equivalent to cleanTranscript() in cleanTranscript.js.
    """
    if not raw_text or not isinstance(raw_text, str):
        return raw_text

    text = raw_text.strip()

    # 1. Apply STT corrections
    for pattern, replacement in STT_CORRECTIONS:
        text = pattern.sub(replacement, text)

    # 2. Strip filler words
    for pattern in FILLER_PATTERNS:
        text = pattern.sub("", text)

    # 3. Remove repeated consecutive words
    text = _remove_repeated_words(text)

    # 4. Collapse multiple spaces and fix punctuation spacing
    text = re.sub(r"\s{2,}", " ", text)
    text = re.sub(r"\s+([,.!?;:])", r"\1", text)
    text = re.sub(r"([,.!?;:])\s*([,.!?;:])", r"\1", text)
    text = re.sub(r",\s*\.", ".", text)
    text = text.strip()

    # 5. Remove duplicate/repeated sentences
    text = _deduplicate_sentences(text)

    return text.strip()
