import dotenv from "dotenv";
import { generateOllamaResponse } from "./ollama.service.js";

dotenv.config();

// ── Helpers ────────────────────────────────────────────────────────────────

const safeJSON = (text) => {
  const clean = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  return JSON.parse(clean);
};

const withRetry = async (fn, retries = 2) => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`⚠️ Ollama attempt ${attempt + 1} failed: ${err.message}, retrying...`);
      await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
    }
  }
};

// ── Domain baseline topics ─────────────────────────────────────────────────
// These are the standard topics an interviewer MUST cover per domain.
// Used as a fallback/supplement when resume doesn't mention them explicitly.

const DOMAIN_BASELINE_TOPICS = {
  "frontend": [
    "JavaScript event loop & async model", "React/Vue component lifecycle", "State management patterns",
    "CSS layout & specificity", "Performance optimization & lazy loading", "Browser rendering pipeline",
    "HTTP & REST API consumption", "Testing (unit, integration, E2E)", "Accessibility (WCAG)", "Build tools & bundlers",
  ],
  "backend": [
    "REST API design principles", "Database design & normalization", "SQL vs NoSQL trade-offs",
    "Authentication & authorization (JWT, OAuth)", "Caching strategies (Redis, Memcached)",
    "Message queues & async processing", "Error handling & logging", "API rate limiting & throttling",
    "Microservices vs monolith", "Security (SQL injection, XSS, CSRF)", "Testing strategies",
  ],
  "fullstack": [
    "End-to-end request lifecycle", "API design & versioning", "Database indexing & query optimization",
    "Authentication flows (JWT, session, OAuth)", "State management (frontend & backend sync)",
    "Caching layers", "Deployment & CI/CD", "Performance profiling", "Security best practices", "Testing pyramid",
  ],
  "data science": [
    "Bias-variance trade-off", "Feature engineering techniques", "Model evaluation metrics (precision, recall, AUC)",
    "Overfitting & regularization", "Cross-validation strategies", "Gradient descent variants",
    "Handling imbalanced datasets", "Data preprocessing & missing values", "A/B testing design",
    "Model deployment & monitoring",
  ],
  "machine learning": [
    "Supervised vs unsupervised learning", "Loss functions & optimization", "Backpropagation",
    "CNN, RNN, Transformer architectures", "Transfer learning", "Regularization (L1, L2, Dropout)",
    "Hyperparameter tuning", "Data augmentation", "Model interpretability (SHAP, LIME)",
    "Production ML pipelines (MLOps)",
  ],
  "devops": [
    "CI/CD pipeline design", "Container orchestration (Kubernetes)", "Infrastructure as Code (Terraform)",
    "Monitoring & alerting (Prometheus, Grafana)", "Log aggregation (ELK stack)",
    "Blue-green & canary deployments", "Service mesh (Istio)", "Secret management",
    "Disaster recovery & SLA", "Security hardening",
  ],
  "android": [
    "Activity & Fragment lifecycle", "Jetpack Compose vs XML layouts", "ViewModel & LiveData",
    "Coroutines & Flow", "Room database", "Retrofit & network calls", "Dependency injection (Hilt)",
    "Background work (WorkManager)", "App performance profiling", "Google Play publishing & signing",
  ],
  "ios": [
    "UIKit vs SwiftUI lifecycle", "ARC & memory management", "Combine framework",
    "Core Data", "URLSession & async/await", "Dependency injection patterns",
    "Background processing", "App extensions", "TestFlight & App Store", "Instruments profiling",
  ],
};

// ── Tech keyword dictionary for local extraction ───────────────────────────
const TECH_KEYWORDS = new Set([
  // Languages
  "javascript", "typescript", "python", "java", "kotlin", "swift", "go", "rust", "c++", "c#", "ruby", "php",
  // Frontend
  "react", "vue", "angular", "svelte", "nextjs", "next.js", "nuxt", "gatsby", "redux", "zustand", "mobx",
  "tailwind", "css", "sass", "less", "webpack", "vite", "babel", "eslint", "jest", "cypress", "playwright",
  "graphql", "apollo", "rest", "axios", "fetch", "websocket", "webrtc",
  // Backend
  "node", "nodejs", "express", "fastify", "nestjs", "django", "flask", "fastapi", "spring", "rails",
  "postgres", "postgresql", "mysql", "mongodb", "redis", "elasticsearch", "cassandra", "dynamodb", "sqlite",
  "prisma", "sequelize", "typeorm", "mongoose", "kafka", "rabbitmq", "celery", "graphql",
  // DevOps/Infra
  "docker", "kubernetes", "k8s", "aws", "gcp", "azure", "terraform", "ansible", "jenkins", "github", "gitlab",
  "nginx", "apache", "linux", "bash", "prometheus", "grafana", "elk", "datadog", "ci/cd", "helm",
  // Concepts
  "microservices", "monolith", "serverless", "event-driven", "cqrs", "ddd", "solid", "jwt", "oauth",
  "websockets", "grpc", "rest", "soap", "caching", "indexing", "sharding", "replication", "load balancer",
  "cdn", "api gateway", "message queue", "pub/sub", "cors", "csrf", "xss", "sql injection",
  // Mobile
  "android", "ios", "react native", "flutter", "jetpack", "compose", "swiftui", "uikit", "coroutines",
  "room", "retrofit", "hilt", "workmanager", "combine", "core data",
  // AI/ML
  "tensorflow", "pytorch", "keras", "scikit-learn", "pandas", "numpy", "jupyter", "mlflow", "huggingface",
  "langchain", "openai", "bert", "gpt", "transformer", "cnn", "rnn", "lstm", "gradient descent", "backprop",
]);

// ── Local resume topic extraction (no AI) ──────────────────────────────────

/**
 * Extract specific technologies and topics from resume + skills.
 * Returns an ordered list: resume-mentioned topics first, then domain baselines.
 */
export function extractResumeTopics(resumeText, skills, domain) {
  const found = new Set();

  // Scan resume text for tech keywords
  if (resumeText) {
    const lower = resumeText.toLowerCase();
    for (const kw of TECH_KEYWORDS) {
      if (lower.includes(kw)) found.add(toTitleCase(kw));
    }
  }

  // Add explicitly declared skills
  if (skills) {
    const skillList = Array.isArray(skills)
      ? skills
      : skills.split(/[,;|\n]+/).map((s) => s.trim());
    for (const s of skillList) {
      if (s.length > 1) found.add(s.trim());
    }
  }

  const resumeTopics = [...found];

  // Get domain baseline topics (not already in resume)
  const normalizedDomain = domain?.toLowerCase() || "fullstack";
  const domainKey = Object.keys(DOMAIN_BASELINE_TOPICS).find((k) => normalizedDomain.includes(k)) || "fullstack";
  const baselines = DOMAIN_BASELINE_TOPICS[domainKey] || DOMAIN_BASELINE_TOPICS["fullstack"];

  // Combine: resume topics first (personalised), then baselines (completeness)
  const allTopics = [
    ...resumeTopics,
    ...baselines.filter((b) => !resumeTopics.some((r) => r.toLowerCase().includes(b.toLowerCase().split(" ")[0]))),
  ];

  console.log(`📋 Topic plan: ${resumeTopics.length} from resume + ${baselines.length} baselines = ${allTopics.length} total`);
  return allTopics;
}

// ── Local keyword extraction from an answer (no AI) ───────────────────────

/**
 * Extract technical keywords from a candidate's answer.
 * Used to inform the next question — probe what they mentioned.
 */
export function extractAnswerKeywords(answerText) {
  if (!answerText) return [];
  const lower = answerText.toLowerCase();
  const found = [];
  for (const kw of TECH_KEYWORDS) {
    if (lower.includes(kw)) found.push(toTitleCase(kw));
  }
  // Also extract capitalised phrases (likely tech names)
  const capPhrases = answerText.match(/\b[A-Z][a-zA-Z]{2,}(?:\.[a-zA-Z]+)?(?:\s[A-Z][a-zA-Z]+)?\b/g) || [];
  for (const p of capPhrases) {
    if (!found.includes(p) && p.length > 3) found.push(p);
  }
  return [...new Set(found)].slice(0, 8);
}

function toTitleCase(str) {
  // Preserve known capitalizations
  const exceptions = {
    "nodejs": "Node.js", "nextjs": "Next.js", "vuejs": "Vue.js", "reactjs": "React.js",
    "graphql": "GraphQL", "postgresql": "PostgreSQL", "mongodb": "MongoDB", "mysql": "MySQL",
    "redis": "Redis", "aws": "AWS", "gcp": "GCP", "k8s": "Kubernetes", "ci/cd": "CI/CD",
    "api": "API", "rest": "REST", "grpc": "gRPC", "sql": "SQL", "css": "CSS", "html": "HTML",
    "javascript": "JavaScript", "typescript": "TypeScript",
  };
  return exceptions[str.toLowerCase()] || (str.charAt(0).toUpperCase() + str.slice(1));
}

// ── Interview stop condition ───────────────────────────────────────────────

/**
 * Decide whether to continue or end the interview.
 * Min 8 questions, max 20. Stop early if all resume topics covered after 8.
 */
export function shouldContinueInterview(answeredCount, coveredTopicCount, totalTopicCount) {
  if (answeredCount < 8) return true;                          // always ask at least 8
  if (answeredCount >= 20) return false;                       // hard cap at 20
  if (coveredTopicCount >= Math.min(totalTopicCount, 12)) return false; // all key topics done
  if (answeredCount >= 12 && coveredTopicCount >= 8) return false;      // enough after 12 Qs
  return true;
}

// ── ADAPTIVE Question generation ──────────────────────────────────────────

/**
 * Generate the next interview question.
 * Uses:
 * - Full resume context (specific technologies, projects)
 * - Keywords from the PREVIOUS answer (probe what they mentioned)
 * - Remaining uncovered topics (ensure breadth)
 * - Interview progression (early = broad, later = deep/tricky)
 */
export const generateQuestion = async ({
  domain,
  role = null,
  experienceLevel,
  salaryRange,
  language = "en",
  resumeText = null,
  skills = null,
  questionNumber = 1,
  existingQuestions = [],
  previousAnswerKeywords = [],  // NEW: keywords from previous answer
  coveredTopics = [],           // NEW: topics already covered
  remainingTopics = [],         // NEW: topics still to cover
  isFollowUp = false,           // NEW: is this a deep-dive follow-up?
}) => {

  // ── Seniority calibration ──
  const salaryMax = salaryRange?.max ?? 0;
  const seniorityLevel =
    salaryMax >= 25 || experienceLevel >= 5
      ? "senior"
      : salaryMax >= 12 || experienceLevel >= 3
      ? "mid"
      : "junior";

  const depthInstruction = {
    senior: "Ask a senior-level question probing architectural decisions, system trade-offs, failure scenarios, or leadership. Expect the candidate to justify every design choice.",
    mid: "Ask a mid-level question requiring solid practical knowledge. Include edge cases, performance implications, or debugging scenarios.",
    junior: "Ask a junior-to-mid level question that tests fundamentals with some practical application. Include a mini coding scenario or a real-world debugging question.",
  }[seniorityLevel];

  // ── Question type rotation to ensure variety ──
  const qTypeIndex = (questionNumber - 1) % 6;
  const questionTypeInstruction = [
    "Ask a deep CONCEPTUAL question — not a definition, but WHY/HOW something works internally. Probe understanding of internals, trade-offs, or failure modes.",
    "Ask a PRACTICAL CODING or implementation question. Ask to describe/write an algorithm, pseudo-code a solution, or walk through code they would actually write.",
    "Ask about a specific REAL PROJECT from their resume. Probe the technical decisions, challenges overcome, scale of the system, and what they would do differently.",
    "Ask a SYSTEM DESIGN question — design a component, API, or scalable feature. They must justify their tech choices, handle edge cases, and think about failure scenarios.",
    "Ask a TRICKY DEBUGGING or failure scenario question: 'Your service starts returning 503 errors under load — walk me through your debugging process.' or 'You merged a PR that caused a memory leak — how do you identify and fix it?'",
    "Ask a BEHAVIORAL question using the STAR format. Focus on real conflicts, production incidents, technical disagreements, or leadership under pressure.",
  ][qTypeIndex];

  // ── Resume context (truncated but specific) ──
  const resumeContext = resumeText
    ? `\nCANDIDATE RESUME EXTRACT (use specific technologies/projects mentioned):\n${resumeText.slice(0, 2000)}`
    : "";

  // ── Previous answer probe ──
  const keywordProbe = previousAnswerKeywords.length > 0
    ? `\nThe candidate's PREVIOUS answer mentioned these technologies/concepts: ${previousAnswerKeywords.join(", ")}.
If this is a follow-up, probe ONE of these specifically — ask about edge cases, failure scenarios, or deeper internals of something they mentioned.`
    : "";

  // ── Topic guidance ──
  const topicGuidance = remainingTopics.length > 0
    ? `\nTopics still NOT covered yet (prioritise these for breadth): ${remainingTopics.slice(0, 5).join(", ")}.`
    : "";

  const coveredNote = coveredTopics.length > 0
    ? `\nAlready covered topics (DO NOT ask about these again): ${coveredTopics.slice(0, 10).join(", ")}.`
    : "";

  // ── Avoid repeats ──
  const avoidList = existingQuestions.length > 0
    ? `\nDo NOT repeat or rephrase any of these already-asked questions:\n${existingQuestions.slice(-8).map((q, i) => `${i + 1}. "${q}"`).join("\n")}`
    : "";

  // ── Salary context ──
  const salaryContext = salaryRange?.max
    ? `Target salary: ${salaryRange.min ?? "N/A"}–${salaryRange.max} LPA (${seniorityLevel}-level role).`
    : "";

  const prompt = `You are a SENIOR TECHNICAL INTERVIEWER at a top-tier product company (think Google, Atlassian, Razorpay, Zepto, or a well-funded Indian startup). You conduct rigorous, real-world interviews — NOT textbook HR rounds.

CANDIDATE PROFILE:
- Role/Domain: ${role ? `${role} — ${domain}` : domain}
- Experience: ${experienceLevel} year(s)
- ${salaryContext}
- Language: ${language === "hi" ? "Hindi" : "English"}
- Skills declared: ${skills ? (Array.isArray(skills) ? skills.join(", ") : skills) : "Not specified"}
${resumeContext}

INTERVIEW STATE:
- Question #${questionNumber}
- Interview phase: ${questionNumber <= 3 ? "Opening (build rapport, test breadth)" : questionNumber <= 8 ? "Core (test depth, real experience)" : "Deep dive (tricky, edge-cases, senior-level probing)"}
${keywordProbe}
${topicGuidance}
${coveredNote}
${avoidList}

QUESTION TYPE FOR THIS TURN:
${questionTypeInstruction}

SENIORITY CALIBRATION:
${depthInstruction}

QUESTION QUALITY RULES (CRITICAL):
- This must feel like a REAL interview question from a product company — not a quiz or textbook exercise.
- Tricky: include edge cases, "what happens when X fails", "compare your approach vs Y", or real production scenarios.
- Specific: reference technologies/projects from their resume when possible. "I see you used Redux — how did you handle async side effects in that project?"
- Avoid questions that can be answered with one sentence or a Wikipedia definition.
- Vary question starters: "Walk me through...", "How would you debug...", "Your team is seeing...", "You've just pushed to prod and...", "Compare X and Y in the context of...", "Design a system that...", "What are the trade-offs of...", "Describe a time when...", etc.
- Keep it to 1-3 sentences — focused and clear.

Return ONLY the question text. No preamble, no numbering, no quotes, no explanation.`;

  return withRetry(async () => {
    const text = (await generateOllamaResponse(prompt, { temperature: 0.75 })).trim().replace(/^["']|["']$/g, "");
    console.log(`✅ Generated Q${questionNumber}: ${text.slice(0, 100)}...`);
    return text;
  });
};


// ── Local clarity/communication scoring (no AI tokens) ─────────────────────

export function computeLocalClarityScore(answerText) {
  if (!answerText || typeof answerText !== "string") {
    return { clarityScore: 1, communicationNotes: "No answer provided" };
  }

  const text = answerText.trim();
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  if (wordCount < 5) {
    return { clarityScore: 1, communicationNotes: "Answer too brief to assess communication" };
  }

  const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
  const sentenceCount = sentences.length;
  const avgSentenceLength = wordCount / Math.max(sentenceCount, 1);

  const structureMarkers = /\b(first(ly)?|second(ly)?|third(ly)?|finally|however|because|therefore|for example|such as|in addition|moreover|furthermore|on the other hand|in contrast|to summarize|in conclusion|specifically|consequently|as a result)\b/gi;
  const structureCount = (text.match(structureMarkers) || []).length;

  const hedgingPatterns = /\b(I think maybe|not sure but|I guess|probably maybe|kind of|sort of|I don't really know|maybe perhaps)\b/gi;
  const hedgingCount = (text.match(hedgingPatterns) || []).length;

  const techTerms = /\b(function|class|api|database|algorithm|complexity|cache|async|thread|memory|server|client|request|response|component|module|interface|architecture|scalable|deployment|pipeline|microservice|container|endpoint|protocol|framework|library|middleware|authentication|authorization|encryption|latency|throughput|optimization|refactor|abstraction)\b/gi;
  const techCount = (text.match(techTerms) || []).length;

  const uniqueWords = new Set(words.map((w) => w.toLowerCase().replace(/[^a-z]/g, ""))).size;
  const vocabDiversity = uniqueWords / wordCount;

  let lengthScore;
  if (wordCount < 15)       lengthScore = 2;
  else if (wordCount < 30)  lengthScore = 4;
  else if (wordCount < 60)  lengthScore = 6;
  else if (wordCount < 200) lengthScore = 8;
  else                      lengthScore = 7;

  let structureScore;
  if (structureCount >= 3)      structureScore = 9;
  else if (structureCount >= 2) structureScore = 7;
  else if (structureCount >= 1) structureScore = 5;
  else                          structureScore = 3;

  let sentenceQuality;
  if (sentenceCount === 1 && wordCount > 30) sentenceQuality = 4;
  else if (avgSentenceLength >= 10 && avgSentenceLength <= 25) sentenceQuality = 8;
  else if (avgSentenceLength < 10) sentenceQuality = 5;
  else sentenceQuality = 6;

  const diversityScore = Math.min(10, Math.round(vocabDiversity * 14));
  const hedgingPenalty = Math.min(3, hedgingCount);
  const techBonus = Math.min(2, Math.floor(techCount / 3));

  const raw = (
    lengthScore * 0.25 +
    structureScore * 0.30 +
    sentenceQuality * 0.20 +
    diversityScore * 0.25 +
    techBonus -
    hedgingPenalty
  );

  const clarityScore = Math.min(10, Math.max(1, Math.round(raw * 10) / 10));

  const notes = [];
  if (wordCount < 30) notes.push("Very brief answer");
  if (structureCount >= 2) notes.push("Well-structured with logical connectors");
  if (hedgingCount > 0) notes.push(`Uses hedging language (${hedgingCount}×)`);
  if (vocabDiversity > 0.7) notes.push("Rich vocabulary");
  if (techCount >= 3) notes.push("Good use of technical terms");

  return {
    clarityScore,
    communicationNotes: notes.join("; ") || "Average communication quality",
    debug: { wordCount, sentenceCount, avgSentenceLength: Math.round(avgSentenceLength), structureCount, hedgingCount, techCount, vocabDiversity: vocabDiversity.toFixed(2) },
  };
}


// ── Batch evaluation (single AI call for all answers) ──────────────────────

export const batchEvaluateInterview = async ({
  questions,
  domain,
  role,
  experienceLevel,
  salaryRange,
  language = "en",
}) => {
  const answered = questions.filter((q) => q.answerText);

  if (answered.length === 0) {
    throw new Error("No answered questions to evaluate");
  }

  const clarityData = answered.map((q) => computeLocalClarityScore(q.answerText));

  const transcript = answered.map((q, i) => {
    const wordCount = q.answerText?.trim().split(/\s+/).length ?? 0;
    const voiceConf = q.confidenceSignals?.voice;
    const voiceNote = voiceConf != null ? `Voice confidence: ${voiceConf}/10` : "No voice data";
    return `Q${i + 1} [${q.topic || "general"}]: ${q.questionText}
Answer (${wordCount} words): ${q.answerText?.slice(0, 500)}
${voiceNote}`;
  }).join("\n\n");

  const salaryHint = salaryRange?.max
    ? `${salaryRange.min ?? "N/A"} – ${salaryRange.max} LPA`
    : "Not specified";

  const prompt = `You are a strict, experienced technical interviewer at a top tech company. Evaluate this COMPLETE interview critically.

Domain: ${role ? `${role} (${domain})` : domain}
Experience Level: ${experienceLevel ?? "Not specified"}
Salary Target: ${salaryHint}
Language: ${language === "hi" ? "Hindi" : "English"}
Total questions answered: ${answered.length}

─── FULL INTERVIEW TRANSCRIPT ───
${transcript.slice(0, 6000)}

─── EVALUATION INSTRUCTIONS ───

For EACH answer (Q1 through Q${answered.length}), provide:
- contentScore (1-10): Technical correctness and depth. 1-2=wrong/off-topic, 3-4=partially correct, 5-6=mostly correct but shallow, 7-8=correct with depth, 9-10=expert-level with trade-offs/examples
- confidenceScore (1-10): Voice data + answer conviction. Hedging or very short answers cap at 4. Wrong answer delivered confidently caps at 5.
- strengths: 1-2 SPECIFIC things done well (reference actual content)
- improvements: 1-2 SPECIFIC actionable gaps (reference what was missing)

Then an OVERALL assessment:
- summary: 3-4 honest sentences referencing specific answers (mention actual questions/technologies)
- topStrengths: 3 specific strengths with evidence
- topImprovements: 3 specific gaps with evidence
- recommendations: 3 actionable study/practice suggestions (specific resources or methods)
- confidenceLevel: "Low" (<5 avg), "Medium" (5-7), "High" (>7)
- salaryReadiness: Honest 2-sentence verdict on salary target
- keyInsight: Single most important takeaway for THIS candidate

PENALTY RULES:
- Under 15 words: contentScore ≤ 3
- Significant factual errors: contentScore ≤ 4
- Generic textbook answer with no personal application: contentScore ≤ 6
- Do NOT give 5 to everything — differentiate

Return ONLY valid JSON (no markdown):
{
  "perAnswer": [
    {"contentScore": <1-10>, "confidenceScore": <1-10>, "strengths": ["<specific>"], "improvements": ["<specific>"]}
  ],
  "summary": "<3-4 sentences>",
  "topStrengths": ["<specific>", "<specific>", "<specific>"],
  "topImprovements": ["<specific>", "<specific>", "<specific>"],
  "recommendations": ["<actionable>", "<actionable>", "<actionable>"],
  "confidenceLevel": "<Low|Medium|High>",
  "salaryReadiness": "<2 sentences>",
  "keyInsight": "<single insight>"
}`;

  console.log(`🧠 Sending batch evaluation to Ollama (${answered.length} answers, ~${prompt.length} chars)...`);

  const resultText = await withRetry(async () => {
    return await generateOllamaResponse(prompt, { temperature: 0.4, num_ctx: 10000 });
  });

  console.log("📊 Ollama batch evaluation raw:", resultText.slice(0, 300));

  const parsed = safeJSON(resultText);

  const perAnswerEvaluations = answered.map((q, i) => {
    const aiEval = parsed.perAnswer?.[i] || {};
    const localClarity = clarityData[i];
    const wordCount = q.answerText?.trim().split(/\s+/).length ?? 0;
    const isVeryShort = wordCount < 15;

    const contentScore  = clamp(aiEval.contentScore) ?? 3;
    const confidenceScore = clamp(aiEval.confidenceScore) ?? 3;
    const clarityScore  = isVeryShort ? Math.min(localClarity.clarityScore, 3) : localClarity.clarityScore;

    const overallScore = Math.round(
      ((isVeryShort ? Math.min(contentScore, 3) : contentScore) * 0.5 +
       clarityScore * 0.3 +
       (isVeryShort ? Math.min(confidenceScore, 4) : confidenceScore) * 0.2) * 10
    ) / 10;

    return {
      contentScore:    isVeryShort ? Math.min(contentScore, 3)    : contentScore,
      clarityScore,
      confidenceScore: isVeryShort ? Math.min(confidenceScore, 4) : confidenceScore,
      overallScore,
      strengths:    Array.isArray(aiEval.strengths)    ? aiEval.strengths.slice(0, 2)    : ["Attempted to answer"],
      improvements: Array.isArray(aiEval.improvements) ? aiEval.improvements.slice(0, 2) : ["Needs more depth"],
    };
  });

  const avg = (key) => perAnswerEvaluations.reduce((s, e) => s + (e[key] || 0), 0) / perAnswerEvaluations.length;
  const avgContent    = avg("contentScore");
  const avgClarity    = avg("clarityScore");
  const avgConfidence = avg("confidenceScore");
  const avgOverall    = avg("overallScore");

  const correctLevel = avgConfidence > 7 ? "High" : avgConfidence >= 5 ? "Medium" : "Low";

  return {
    perAnswerEvaluations,
    report: {
      summary:          parsed.summary || `Completed ${answered.length} questions in ${domain}.`,
      topStrengths:     Array.isArray(parsed.topStrengths)     ? parsed.topStrengths.slice(0, 3)     : [],
      topImprovements:  Array.isArray(parsed.topImprovements)  ? parsed.topImprovements.slice(0, 3)  : [],
      recommendations:  Array.isArray(parsed.recommendations)  ? parsed.recommendations.slice(0, 3)  : [],
      confidenceLevel:  correctLevel,
      salaryReadiness:  parsed.salaryReadiness || null,
      keyInsight:       parsed.keyInsight      || null,
      scores: {
        content:    parseFloat(avgContent.toFixed(2)),
        clarity:    parseFloat(avgClarity.toFixed(2)),
        confidence: parseFloat(avgConfidence.toFixed(2)),
        overall:    parseFloat(avgOverall.toFixed(2)),
      },
    },
  };
};

function clamp(val, min = 1, max = 10) {
  const n = Number(val);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, Math.round(n * 10) / 10));
}