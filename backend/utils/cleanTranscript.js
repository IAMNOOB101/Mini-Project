/**
 * cleanTranscript.js
 * Cleans speech-to-text transcriptions before saving.
 * - Removes filler words (um, uh, like, you know, etc.)
 * - Removes exact and near-duplicate consecutive sentences
 * - Collapses excessive whitespace and punctuation artifacts
 * - Fixes common STT misrecognitions
 */

/** Common speech filler patterns to strip */
const FILLER_PATTERNS = [
  // Standalone filler words (whole word only, case-insensitive)
  /\b(um+|uh+|hmm+|hm+|er+|erm+|ah+|oh+|uhh+|umm+)\b/gi,
  // Common filler phrases
  /\b(you know(,| what I mean)?|I mean|like I said|so basically|basically|you see|I guess|kind of|sort of|right\?|okay so|so yeah|and uh|and um|and like|let me think|let me see|I think basically|well basically)\b/gi,
  // Repeated "like" used as filler (not when followed by a noun or used correctly)
  /\blike\s+like\b/gi,
];

/** Common STT misrecognition corrections */
const STT_CORRECTIONS = [
  [/\bJava Script\b/gi, "JavaScript"],
  [/\bType Script\b/gi, "TypeScript"],
  [/\bnode JS\b/gi, "Node.js"],
  [/\bReact JS\b/gi, "React.js"],
  [/\bmon go\b/gi, "MongoDB"],
  [/\bpost gress\b/gi, "PostgreSQL"],
  [/\bpost gre\b/gi, "PostgreSQL"],
  [/\bkubernetes\b/gi, "Kubernetes"],
  [/\bdocker\b/gi, "Docker"],
  [/\bgit hub\b/gi, "GitHub"],
  [/\bapi\b/g, "API"],
  [/\bsql\b/gi, "SQL"],
  [/\baws\b/gi, "AWS"],
  [/\bgcp\b/gi, "GCP"],
  [/\bai\b/gi, "AI"],
  [/\bml\b/gi, "ML"],
  [/\bci cd\b/gi, "CI/CD"],
  [/\bci\/cd\b/gi, "CI/CD"],
  [/\brestful\b/gi, "RESTful"],
  [/\brest api\b/gi, "REST API"],
];

/**
 * Remove duplicate or near-duplicate consecutive sentences.
 * A sentence is considered a duplicate if its normalized form
 * matches another within a 3-sentence window.
 */
function deduplicateSentences(text) {
  // Split on sentence-ending punctuation or double spaces
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length <= 1) return text;

  const normalize = (s) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const kept = [];
  const recentNorms = [];

  for (const sentence of sentences) {
    const norm = normalize(sentence);

    // Skip if identical or very similar to a recent sentence
    const isDupe = recentNorms.some((prev) => {
      if (norm === prev) return true;
      // Levenshtein-lite: if one contains the other and both > 10 chars
      if (norm.length > 10 && prev.length > 10) {
        if (norm.includes(prev) || prev.includes(norm)) return true;
      }
      return false;
    });

    if (!isDupe) {
      kept.push(sentence);
      recentNorms.push(norm);
      if (recentNorms.length > 4) recentNorms.shift(); // sliding window of 4
    }
  }

  return kept.join(" ");
}

/**
 * Remove repeated consecutive words (e.g., "the the", "I I", "is is")
 */
function removeRepeatedWords(text) {
  return text.replace(/\b(\w+)\s+\1\b/gi, "$1");
}

/**
 * Main clean function.
 * @param {string} rawText - raw speech-to-text transcription
 * @returns {string} cleaned transcription
 */
export function cleanTranscript(rawText) {
  if (!rawText || typeof rawText !== "string") return rawText;

  let text = rawText.trim();

  // 1. Apply STT corrections first
  for (const [pattern, replacement] of STT_CORRECTIONS) {
    text = text.replace(pattern, replacement);
  }

  // 2. Strip filler words
  for (const pattern of FILLER_PATTERNS) {
    text = text.replace(pattern, "");
  }

  // 3. Remove repeated consecutive words
  text = removeRepeatedWords(text);

  // 4. Collapse multiple spaces and fix punctuation spacing
  text = text
    .replace(/\s{2,}/g, " ")           // multiple spaces → single
    .replace(/\s+([,.!?;:])/g, "$1")   // space before punctuation
    .replace(/([,.!?;:])\s*([,.!?;:])/g, "$1") // double punctuation
    .replace(/,\s*\./g, ".")           // ", ." → "."
    .trim();

  // 5. Remove duplicate/repeated sentences
  text = deduplicateSentences(text);

  // 6. Final cleanup — ensure it ends properly
  text = text.trim();
  if (text.length > 0 && !/[.!?]$/.test(text)) {
    // Don't add punctuation — just clean the ending whitespace
  }

  return text;
}
