"""
ai_service.py
Python port of ai.service.js.
Contains: topic extraction, answer keyword extraction, question generation,
local clarity scoring, batch evaluation, and interview stop conditions.
"""
import re
import json
import time
import logging
from typing import Optional

from .ollama_service import generate_ollama_response

logger = logging.getLogger(__name__)

# ── Domain baseline topics ─────────────────────────────────────────────────────
DOMAIN_BASELINE_TOPICS = {
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
}

# ── Tech keyword dictionary for local extraction ───────────────────────────────
TECH_KEYWORDS = {
    # Languages
    "javascript", "typescript", "python", "java", "kotlin", "swift", "go", "rust", "c++", "c#", "ruby", "php",
    # Frontend
    "react", "vue", "angular", "svelte", "nextjs", "next.js", "nuxt", "gatsby", "redux", "zustand", "mobx",
    "tailwind", "css", "sass", "less", "webpack", "vite", "babel", "eslint", "jest", "cypress", "playwright",
    "graphql", "apollo", "rest", "axios", "fetch", "websocket", "webrtc",
    # Backend
    "node", "nodejs", "express", "fastify", "nestjs", "django", "flask", "fastapi", "spring", "rails",
    "postgres", "postgresql", "mysql", "mongodb", "redis", "elasticsearch", "cassandra", "dynamodb", "sqlite",
    "prisma", "sequelize", "typeorm", "mongoose", "kafka", "rabbitmq", "celery",
    # DevOps/Infra
    "docker", "kubernetes", "k8s", "aws", "gcp", "azure", "terraform", "ansible", "jenkins", "github", "gitlab",
    "nginx", "apache", "linux", "bash", "prometheus", "grafana", "elk", "datadog", "ci/cd", "helm",
    # Concepts
    "microservices", "monolith", "serverless", "event-driven", "cqrs", "ddd", "solid", "jwt", "oauth",
    "websockets", "grpc", "soap", "caching", "indexing", "sharding", "replication", "load balancer",
    "cdn", "api gateway", "message queue", "pub/sub", "cors", "csrf", "xss", "sql injection",
    # Mobile
    "android", "ios", "react native", "flutter", "jetpack", "compose", "swiftui", "uikit", "coroutines",
    "room", "retrofit", "hilt", "workmanager", "combine", "core data",
    # AI/ML
    "tensorflow", "pytorch", "keras", "scikit-learn", "pandas", "numpy", "jupyter", "mlflow", "huggingface",
    "langchain", "openai", "bert", "gpt", "transformer", "cnn", "rnn", "lstm", "gradient descent", "backprop",
}

_EXCEPTIONS = {
    "nodejs": "Node.js", "nextjs": "Next.js", "vuejs": "Vue.js", "reactjs": "React.js",
    "graphql": "GraphQL", "postgresql": "PostgreSQL", "mongodb": "MongoDB", "mysql": "MySQL",
    "redis": "Redis", "aws": "AWS", "gcp": "GCP", "k8s": "Kubernetes", "ci/cd": "CI/CD",
    "api": "API", "rest": "REST", "grpc": "gRPC", "sql": "SQL", "css": "CSS", "html": "HTML",
    "javascript": "JavaScript", "typescript": "TypeScript",
}


def _to_title_case(kw: str) -> str:
    return _EXCEPTIONS.get(kw.lower(), kw.capitalize())


def _safe_json(text: str) -> dict:
    clean = re.sub(r"```json\s*", "", text, flags=re.IGNORECASE)
    clean = re.sub(r"```\s*", "", clean).strip()
    match = re.search(r"\{.*\}", clean, flags=re.DOTALL)
    if match:
        clean = match.group(0)
    return json.loads(clean)


def generate_gemini_response(prompt: str, temperature: float = 0.7) -> str:
    """Call Google Gemini REST API using configured API key and model."""
    from django.conf import settings
    import requests

    api_key = getattr(settings, "GEMINI_API_KEY", None)
    if not api_key:
        raise ValueError("GEMINI_API_KEY not configured")

    model = getattr(settings, "GEMINI_MODEL", "gemini-3.6-flash")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": temperature,
        },
    }

    resp = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    candidates = data.get("candidates", [])
    if not candidates:
        raise ValueError("No candidates returned from Gemini")

    parts = candidates[0].get("content", {}).get("parts", [])
    text_parts = [p.get("text", "") for p in parts if "text" in p]
    return "".join(text_parts).strip()


def generate_ai_completion(prompt: str, temperature: float = 0.7, num_ctx: int = 8192) -> str:
    """Try Gemini first; fall back to Ollama if unavailable."""
    from django.conf import settings

    gemini_key = getattr(settings, "GEMINI_API_KEY", None)
    if gemini_key:
        try:
            return generate_gemini_response(prompt, temperature=temperature)
        except Exception as err:
            logger.warning("⚠️ Gemini call failed: %s, checking Ollama...", err)

    try:
        return generate_ollama_response(prompt, temperature=temperature, num_ctx=num_ctx)
    except Exception as err:
        logger.warning("⚠️ Ollama call failed: %s", err)
        raise


def _with_retry(fn, retries: int = 2):
    for attempt in range(retries + 1):
        try:
            return fn()
        except Exception as err:
            if attempt == retries:
                raise
            logger.warning("⚠️ AI attempt %d failed: %s, retrying...", attempt + 1, err)
            time.sleep(0.6 * (attempt + 1))


# ── Public API ─────────────────────────────────────────────────────────────────

def extract_resume_topics(resume_text: Optional[str], skills: Optional[str], domain: Optional[str]) -> list[str]:
    """
    Extract specific technologies and topics from resume + skills.
    Returns ordered list: resume-mentioned topics first, then domain baselines.
    Equivalent to extractResumeTopics() in ai.service.js.
    """
    found: set[str] = set()

    if resume_text:
        lower = resume_text.lower()
        for kw in TECH_KEYWORDS:
            if kw in lower:
                found.add(_to_title_case(kw))

    if skills:
        skill_list = skills if isinstance(skills, list) else re.split(r"[,;|\n]+", skills)
        for s in skill_list:
            s = s.strip()
            if len(s) > 1:
                found.add(s)

    resume_topics = list(found)

    # Domain baseline
    normalized_domain = (domain or "fullstack").lower()
    domain_key = next((k for k in DOMAIN_BASELINE_TOPICS if normalized_domain.find(k) != -1), "fullstack")
    baselines = DOMAIN_BASELINE_TOPICS.get(domain_key, DOMAIN_BASELINE_TOPICS["fullstack"])

    all_topics = resume_topics + [
        b for b in baselines
        if not any(rt.lower().find(b.lower().split(" ")[0]) != -1 for rt in resume_topics)
    ]

    logger.info(
        "📋 Topic plan: %d from resume + %d baselines = %d total",
        len(resume_topics), len(baselines), len(all_topics),
    )
    return all_topics


def extract_answer_keywords(answer_text: str) -> list[str]:
    """
    Extract technical keywords from a candidate's answer.
    Equivalent to extractAnswerKeywords() in ai.service.js.
    """
    if not answer_text:
        return []
    lower = answer_text.lower()
    found = []
    for kw in TECH_KEYWORDS:
        if kw in lower:
            found.append(_to_title_case(kw))

    # Also extract capitalised phrases (likely tech names)
    cap_phrases = re.findall(r"\b[A-Z][a-zA-Z]{2,}(?:\.[a-zA-Z]+)?(?:\s[A-Z][a-zA-Z]+)?\b", answer_text)
    for p in cap_phrases:
        if p not in found and len(p) > 3:
            found.append(p)

    return list(dict.fromkeys(found))[:8]  # deduplicate, limit to 8


def should_continue_interview(answered_count: int, covered_topic_count: int, total_topic_count: int) -> bool:
    """
    Decide whether to continue or end the interview.
    Min 5 questions, max 12. Stop early if all resume topics covered after 8.
    Equivalent to shouldContinueInterview() in ai.service.js.
    """
    if answered_count < 5:
        return True
    if answered_count >= 12:
        return False
    if covered_topic_count >= min(total_topic_count, 8):
        return False
    if answered_count >= 8 and covered_topic_count >= 5:
        return False
    return True


def generate_question(
    *,
    domain: str,
    role: Optional[str] = None,
    experience_level=None,
    salary_range: Optional[dict] = None,
    language: str = "en",
    resume_text: Optional[str] = None,
    skills=None,
    question_number: int = 1,
    existing_questions: list[str] = None,
    previous_answer_keywords: list[str] = None,
    covered_topics: list[str] = None,
    remaining_topics: list[str] = None,
    is_follow_up: bool = False,
) -> str:
    """
    Generate the next interview question via Ollama.
    Equivalent to generateQuestion() in ai.service.js.
    """
    existing_questions = existing_questions or []
    previous_answer_keywords = previous_answer_keywords or []
    covered_topics = covered_topics or []
    remaining_topics = remaining_topics or []
    salary_range = salary_range or {}

    salary_max = salary_range.get("max", 0) or 0
    exp_level = experience_level or 0
    try:
        exp_level = float(exp_level)
    except (TypeError, ValueError):
        exp_level = 0

    if salary_max >= 25 or exp_level >= 5:
        seniority = "senior"
    elif salary_max >= 12 or exp_level >= 3:
        seniority = "mid"
    else:
        seniority = "junior"

    depth_instruction = {
        "senior": "Ask a senior-level question probing architectural decisions, system trade-offs, failure scenarios, or leadership. Expect the candidate to justify every design choice.",
        "mid":    "Ask a mid-level question requiring solid practical knowledge. Include edge cases, performance implications, or debugging scenarios.",
        "junior": "Ask a junior-to-mid level question that tests fundamentals with some practical application. Include a mini coding scenario or a real-world debugging question.",
    }[seniority]

    question_type_instructions = [
        "Ask a deep CONCEPTUAL question — not a definition, but WHY/HOW something works internally. Probe understanding of internals, trade-offs, or failure modes.",
        "Ask a PRACTICAL CODING or implementation question. Ask to describe/write an algorithm, pseudo-code a solution, or walk through code they would actually write.",
        "Ask about a specific REAL PROJECT from their resume. Probe the technical decisions, challenges overcome, scale of the system, and what they would do differently.",
        "Ask a SYSTEM DESIGN question — design a component, API, or scalable feature. They must justify their tech choices, handle edge cases, and think about failure scenarios.",
        "Ask a TRICKY DEBUGGING or failure scenario question: 'Your service starts returning 503 errors under load — walk me through your debugging process.'",
        "Ask a BEHAVIORAL question using the STAR format. Focus on real conflicts, production incidents, technical disagreements, or leadership under pressure.",
    ]
    q_type_instruction = question_type_instructions[(question_number - 1) % 6]

    resume_context = (
        f"\nCANDIDATE RESUME EXTRACT (use specific technologies/projects mentioned):\n{resume_text[:2000]}"
        if resume_text else ""
    )
    keyword_probe = (
        f"\nThe candidate's PREVIOUS answer mentioned these technologies/concepts: {', '.join(previous_answer_keywords)}.\n"
        "If this is a follow-up, probe ONE of these specifically — ask about edge cases, failure scenarios, or deeper internals of something they mentioned."
        if previous_answer_keywords else ""
    )
    topic_guidance = (
        f"\nTopics still NOT covered yet (prioritise these for breadth): {', '.join(remaining_topics[:5])}."
        if remaining_topics else ""
    )
    covered_note = (
        f"\nAlready covered topics (DO NOT ask about these again): {', '.join(covered_topics[:10])}."
        if covered_topics else ""
    )
    avoid_list = (
        "\nDo NOT repeat or rephrase any of these already-asked questions:\n" +
        "\n".join(f'{i+1}. "{q}"' for i, q in enumerate(existing_questions[-8:]))
        if existing_questions else ""
    )
    salary_context = (
        f"Target salary: {salary_range.get('min', 'N/A')}–{salary_range.get('max')} LPA ({seniority}-level role)."
        if salary_range.get("max") else ""
    )

    if question_number <= 3:
        phase = "Opening (build rapport, test breadth)"
    elif question_number <= 8:
        phase = "Core (test depth, real experience)"
    else:
        phase = "Deep dive (tricky, edge-cases, senior-level probing)"

    skills_str = (", ".join(skills) if isinstance(skills, list) else skills) if skills else "Not specified"

    prompt = f"""You are a SENIOR TECHNICAL INTERVIEWER at a top-tier product company (think Google, Atlassian, Razorpay, Zepto, or a well-funded Indian startup). You conduct rigorous, real-world interviews — NOT textbook HR rounds.

CANDIDATE PROFILE:
- Role/Domain: {f"{role} — {domain}" if role else domain}
- Experience: {experience_level} year(s)
- {salary_context}
- Language: {"Hindi" if language == "hi" else "English"}
- Skills declared: {skills_str}
{resume_context}

INTERVIEW STATE:
- Question #{question_number}
- Interview phase: {phase}
{keyword_probe}
{topic_guidance}
{covered_note}
{avoid_list}

QUESTION TYPE FOR THIS TURN:
{q_type_instruction}

SENIORITY CALIBRATION:
{depth_instruction}

QUESTION QUALITY RULES (CRITICAL):
- This must feel like a REAL interview question from a product company — not a quiz or textbook exercise.
- Tricky: include edge cases, "what happens when X fails", "compare your approach vs Y", or real production scenarios.
- Specific: reference technologies/projects from their resume when possible.
- Avoid questions that can be answered with one sentence or a Wikipedia definition.
- Vary question starters: "Walk me through...", "How would you debug...", "Your team is seeing...", "You've just pushed to prod and...", "Compare X and Y in the context of...", "Design a system that...", etc.
- Keep it to 1-3 sentences — focused and clear.

Return ONLY the question text. No preamble, no numbering, no quotes, no explanation."""

    def _call():
        text = generate_ai_completion(prompt, temperature=0.75).strip().strip('"\'')
        logger.info("✅ Generated Q%d: %s...", question_number, text[:100])
        return text

    return _with_retry(_call)


# ── Local clarity/communication scoring (no AI tokens) ────────────────────────

def compute_local_clarity_score(answer_text: str) -> dict:
    """
    Score communication quality locally without calling AI.
    Equivalent to computeLocalClarityScore() in ai.service.js.
    """
    if not answer_text or not isinstance(answer_text, str):
        return {"clarityScore": 1, "communicationNotes": "No answer provided"}

    text = answer_text.strip()
    words = re.split(r"\s+", text)
    words = [w for w in words if w]
    word_count = len(words)

    if word_count < 5:
        return {"clarityScore": 1, "communicationNotes": "Answer too brief to assess communication"}

    sentences = [s.strip() for s in re.split(r"[.!?]+", text) if s.strip()]
    sentence_count = len(sentences)
    avg_sentence_length = word_count / max(sentence_count, 1)

    structure_count = len(re.findall(
        r"\b(first(ly)?|second(ly)?|third(ly)?|finally|however|because|therefore|for example|such as|"
        r"in addition|moreover|furthermore|on the other hand|in contrast|to summarize|in conclusion|"
        r"specifically|consequently|as a result)\b",
        text, re.IGNORECASE
    ))

    hedging_count = len(re.findall(
        r"\b(I think maybe|not sure but|I guess|probably maybe|kind of|sort of|I don't really know|maybe perhaps)\b",
        text, re.IGNORECASE
    ))

    tech_count = len(re.findall(
        r"\b(function|class|api|database|algorithm|complexity|cache|async|thread|memory|server|client|"
        r"request|response|component|module|interface|architecture|scalable|deployment|pipeline|"
        r"microservice|container|endpoint|protocol|framework|library|middleware|authentication|"
        r"authorization|encryption|latency|throughput|optimization|refactor|abstraction)\b",
        text, re.IGNORECASE
    ))

    unique_words = len(set(re.sub(r"[^a-z]", "", w.lower()) for w in words if w))
    vocab_diversity = unique_words / word_count

    if word_count < 15:      length_score = 2
    elif word_count < 30:    length_score = 4
    elif word_count < 60:    length_score = 6
    elif word_count < 200:   length_score = 8
    else:                    length_score = 7

    if structure_count >= 3:     structure_score = 9
    elif structure_count >= 2:   structure_score = 7
    elif structure_count >= 1:   structure_score = 5
    else:                        structure_score = 3

    if sentence_count == 1 and word_count > 30:  sentence_quality = 4
    elif 10 <= avg_sentence_length <= 25:         sentence_quality = 8
    elif avg_sentence_length < 10:               sentence_quality = 5
    else:                                         sentence_quality = 6

    diversity_score = min(10, round(vocab_diversity * 14))
    hedging_penalty = min(3, hedging_count)
    tech_bonus = min(2, tech_count // 3)

    raw = (
        length_score * 0.25
        + structure_score * 0.30
        + sentence_quality * 0.20
        + diversity_score * 0.25
        + tech_bonus
        - hedging_penalty
    )
    clarity_score = min(10, max(1, round(raw * 10) / 10))

    notes = []
    if word_count < 30:           notes.append("Very brief answer")
    if structure_count >= 2:      notes.append("Well-structured with logical connectors")
    if hedging_count > 0:         notes.append(f"Uses hedging language ({hedging_count}×)")
    if vocab_diversity > 0.7:     notes.append("Rich vocabulary")
    if tech_count >= 3:           notes.append("Good use of technical terms")

    return {
        "clarityScore": clarity_score,
        "communicationNotes": "; ".join(notes) or "Average communication quality",
        "debug": {
            "wordCount": word_count,
            "sentenceCount": sentence_count,
            "avgSentenceLength": round(avg_sentence_length),
            "structureCount": structure_count,
            "hedgingCount": hedging_count,
            "techCount": tech_count,
            "vocabDiversity": round(vocab_diversity, 2),
        },
    }


# ── Batch evaluation (single AI call for all answers) ─────────────────────────

def _clamp(val, mn: float = 1, mx: float = 10):
    try:
        n = float(val)
        if not (mn <= n <= mx + 0.001):
            n = max(mn, min(mx, n))
        return round(n * 10) / 10
    except (TypeError, ValueError):
        return None


def batch_evaluate_interview(*, questions: list, domain: str, role=None, experience_level=None, salary_range=None, language: str = "en") -> dict:
    """
    Batch evaluate all interview answers with a single Ollama call.
    Equivalent to batchEvaluateInterview() in ai.service.js.
    """
    answered = [q for q in questions if q.get("answerText")]
    if not answered:
        raise ValueError("No answered questions to evaluate")

    clarity_data = [compute_local_clarity_score(q["answerText"]) for q in answered]
    salary_range = salary_range or {}

    transcript = "\n\n".join(
        f"Q{i+1} [{q.get('topic', 'general')}]: {q['questionText']}\n"
        f"Answer ({len(q['answerText'].split())} words): {q['answerText'][:500]}\n"
        f"{'Voice confidence: ' + str(q.get('confidenceSignals', {}).get('voice', '')) + '/10' if q.get('confidenceSignals', {}).get('voice') is not None else 'No voice data'}"
        for i, q in enumerate(answered)
    )

    salary_hint = f"{salary_range.get('min', 'N/A')} – {salary_range.get('max')} LPA" if salary_range.get("max") else "Not specified"

    prompt = f"""You are a strict, experienced technical interviewer at a top tech company. Evaluate this COMPLETE interview critically.

Domain: {f"{role} ({domain})" if role else domain}
Experience Level: {experience_level or "Not specified"}
Salary Target: {salary_hint}
Language: {"Hindi" if language == "hi" else "English"}
Total questions answered: {len(answered)}

─── FULL INTERVIEW TRANSCRIPT ───
{transcript[:6000]}

─── EVALUATION INSTRUCTIONS ───

For EACH answer (Q1 through Q{len(answered)}), provide:
- contentScore (1-10): Technical correctness and depth.
- confidenceScore (1-10): Voice data + answer conviction. Hedging or very short answers cap at 4.
- strengths: 1-2 SPECIFIC things done well (reference actual content)
- improvements: 1-2 SPECIFIC actionable gaps (reference what was missing)

Then an OVERALL assessment:
- summary: 3-4 honest sentences referencing specific answers
- topStrengths: 3 specific strengths with evidence
- topImprovements: 3 specific gaps with evidence
- recommendations: 3 actionable study/practice suggestions
- confidenceLevel: "Low" (<5 avg), "Medium" (5-7), "High" (>7)
- salaryReadiness: Honest 2-sentence verdict on salary target
- keyInsight: Single most important takeaway for THIS candidate

PENALTY RULES:
- Under 15 words: contentScore ≤ 3
- Significant factual errors: contentScore ≤ 4
- Generic textbook answer with no personal application: contentScore ≤ 6

Return ONLY valid JSON (no markdown):
{{
  "perAnswer": [
    {{"contentScore": <1-10>, "confidenceScore": <1-10>, "strengths": ["<specific>"], "improvements": ["<specific>"]}}
  ],
  "summary": "<3-4 sentences>",
  "topStrengths": ["<specific>", "<specific>", "<specific>"],
  "topImprovements": ["<specific>", "<specific>", "<specific>"],
  "recommendations": ["<actionable>", "<actionable>", "<actionable>"],
  "confidenceLevel": "<Low|Medium|High>",
  "salaryReadiness": "<2 sentences>",
  "keyInsight": "<single insight>"
}}"""

    logger.info("🧠 Sending batch evaluation to AI provider (%d answers, ~%d chars)...", len(answered), len(prompt))

    result_text = _with_retry(lambda: generate_ai_completion(prompt, temperature=0.4, num_ctx=10000))
    logger.info("📊 AI batch evaluation raw: %s", result_text[:300])

    parsed = _safe_json(result_text)

    per_answer_evaluations = []
    for i, q in enumerate(answered):
        ai_eval = parsed.get("perAnswer", [{}])[i] if i < len(parsed.get("perAnswer", [])) else {}
        local_clarity = clarity_data[i]
        word_count = len(q["answerText"].split())
        is_very_short = word_count < 15

        content_score    = _clamp(ai_eval.get("contentScore")) or 3
        confidence_score = _clamp(ai_eval.get("confidenceScore")) or 3
        clarity_score    = min(local_clarity["clarityScore"], 3) if is_very_short else local_clarity["clarityScore"]

        if is_very_short:
            content_score    = min(content_score, 3)
            confidence_score = min(confidence_score, 4)

        overall_score = round((content_score * 0.5 + clarity_score * 0.3 + confidence_score * 0.2) * 10) / 10

        per_answer_evaluations.append({
            "contentScore":    content_score,
            "clarityScore":    clarity_score,
            "confidenceScore": confidence_score,
            "overallScore":    overall_score,
            "strengths":    (ai_eval.get("strengths") or ["Attempted to answer"])[:2],
            "improvements": (ai_eval.get("improvements") or ["Needs more depth"])[:2],
        })

    def avg(key):
        vals = [e[key] for e in per_answer_evaluations]
        return sum(vals) / len(vals) if vals else 0

    avg_content    = avg("contentScore")
    avg_clarity    = avg("clarityScore")
    avg_confidence = avg("confidenceScore")
    avg_overall    = avg("overallScore")

    correct_level = "High" if avg_confidence > 7 else ("Medium" if avg_confidence >= 5 else "Low")

    return {
        "perAnswerEvaluations": per_answer_evaluations,
        "report": {
            "summary":          parsed.get("summary", f"Completed {len(answered)} questions in {domain}."),
            "topStrengths":     (parsed.get("topStrengths") or [])[:3],
            "topImprovements":  (parsed.get("topImprovements") or [])[:3],
            "recommendations":  (parsed.get("recommendations") or [])[:3],
            "confidenceLevel":  correct_level,
            "salaryReadiness":  parsed.get("salaryReadiness"),
            "keyInsight":       parsed.get("keyInsight"),
            "scores": {
                "content":    round(avg_content, 2),
                "clarity":    round(avg_clarity, 2),
                "confidence": round(avg_confidence, 2),
                "overall":    round(avg_overall, 2),
            },
        },
    }
