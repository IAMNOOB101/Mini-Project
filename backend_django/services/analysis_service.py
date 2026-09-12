"""
analysis_service.py
Python port of analysis.service.js.
Orchestrates interview analysis using Ollama batch eval (primary) + heuristic fallback.
"""
import logging
from .ai_service import batch_evaluate_interview, compute_local_clarity_score

logger = logging.getLogger(__name__)


def _build_fallback_report(answered: list, domain: str, role=None) -> dict:
    """
    Build a real analysis report purely from local heuristic data.
    Used when Ollama is unavailable.
    Equivalent to buildFallbackReport() in analysis.service.js.
    """
    clarity_data = [compute_local_clarity_score(q["answerText"]) for q in answered]
    avg_clarity = sum(c["clarityScore"] for c in clarity_data) / (len(clarity_data) or 1)

    tech_pattern = (
        r"\b(function|class|api|database|algorithm|complexity|cache|async|thread|memory|"
        r"server|client|request|response|component|module|interface|architecture)\b"
    )

    import re
    def _content_estimate(q: dict) -> float:
        wc = len(q["answerText"].split()) if q.get("answerText") else 0
        tech_count = len(re.findall(tech_pattern, q.get("answerText", ""), re.IGNORECASE))
        if wc < 15:  return 2
        if wc < 30:  return 3 + min(2, tech_count)
        if tech_count >= 3: return 6 + min(2, tech_count // 3)
        return 4

    content_estimates = [_content_estimate(q) for q in answered]
    avg_content = sum(content_estimates) / (len(content_estimates) or 1)

    conf_scores = [min(10, max(1, q.get("confidenceSignals", {}).get("voice", 5) or 5)) for q in answered]
    avg_confidence = sum(conf_scores) / (len(conf_scores) or 1)
    avg_overall = avg_content * 0.5 + avg_clarity * 0.3 + avg_confidence * 0.2

    per_answer_evaluations = []
    for i, q in enumerate(answered):
        wc = len(q["answerText"].split()) if q.get("answerText") else 0
        is_short = wc < 15
        content = min(content_estimates[i], 3) if is_short else content_estimates[i]
        clarity  = min(clarity_data[i]["clarityScore"], 3) if is_short else clarity_data[i]["clarityScore"]
        conf     = min(conf_scores[i], 4) if is_short else conf_scores[i]
        overall  = round((content * 0.5 + clarity * 0.3 + conf * 0.2) * 10) / 10
        per_answer_evaluations.append({
            "contentScore":    content,
            "clarityScore":    clarity,
            "confidenceScore": conf,
            "overallScore":    overall,
            "strengths":    ["Provided a detailed response"] if wc >= 50 else ["Attempted to answer"],
            "improvements": ["Answer too brief — expand with examples and reasoning"] if is_short else ["Add more specific technical details"],
        })

    perf_label = "strong" if avg_overall >= 8 else ("solid" if avg_overall >= 6 else ("moderate" if avg_overall >= 4 else "weak"))
    content_note = (
        "Technical accuracy and depth need significant improvement." if avg_content < 5
        else "Technical content was partially correct but lacked depth in several areas." if avg_content < 7
        else "Technical content was generally accurate and well-explained."
    )
    clarity_note = (
        "Answers were often unclear or poorly structured." if avg_clarity < 5
        else "Clarity was adequate but could benefit from more structured responses." if avg_clarity < 7
        else "Communication was clear and well-organized."
    )

    summary = (
        f"Completed {len(answered)} questions in {role or domain} with an overall score of {avg_overall:.1f}/10 "
        f"— a {perf_label} performance. {content_note} {clarity_note}"
    )

    top_strengths = []
    if avg_clarity    >= 6: top_strengths.append("Clear and structured communication throughout the interview")
    if avg_content    >= 6: top_strengths.append("Demonstrated solid technical knowledge in core areas")
    if avg_confidence >= 6: top_strengths.append("Confident delivery and consistent speaking pace")
    if not top_strengths:   top_strengths.append("Made an effort to answer all questions presented")

    top_improvements = []
    if avg_content < 6: top_improvements.append("Deepen technical knowledge — answers lacked precision and factual accuracy")
    if avg_clarity < 6: top_improvements.append("Structure answers more clearly — use concept → example → trade-offs flow")
    if avg_content < 7: top_improvements.append("Provide concrete, specific examples from real projects")
    short_answers = [q for q in answered if len((q.get("answerText") or "").split()) < 30]
    if short_answers:
        top_improvements.append(f"Expand answers — {len(short_answers)} answer(s) were too brief")
    if not top_improvements:
        top_improvements.append("Continue practicing to maintain performance")

    recommendations = []
    if avg_content < 6: recommendations.append(f"Study core {domain} fundamentals using official documentation and courses")
    if avg_clarity < 6: recommendations.append("Practice the STAR method and record yourself answering questions")
    if avg_overall < 7: recommendations.append("Do 2-3 mock interviews per week on platforms like Pramp or Interviewing.io")
    recommendations.append("Review the specific questions where you scored lowest and write out comprehensive answers")

    level = "High" if avg_confidence > 7 else ("Medium" if avg_confidence >= 5 else "Low")
    salary_readiness = (
        f"With an overall score of {avg_overall:.1f}/10, performance is on track for the target salary range."
        if avg_overall >= 7
        else f"An overall score of {avg_overall:.1f}/10 suggests further preparation is needed before targeting the expected salary range."
    )
    key_insight = f"Priority focus: {top_improvements[0]}" if top_improvements else "Focus on providing concrete examples and specific technical details in every answer."

    return {
        "perAnswerEvaluations": per_answer_evaluations,
        "report": {
            "summary":         summary,
            "topStrengths":    top_strengths[:3],
            "topImprovements": top_improvements[:3],
            "recommendations": recommendations[:3],
            "confidenceLevel": level,
            "salaryReadiness": salary_readiness,
            "keyInsight":      key_insight,
            "scores": {
                "content":    round(avg_content, 2),
                "clarity":    round(avg_clarity, 2),
                "confidence": round(avg_confidence, 2),
                "overall":    round(avg_overall, 2),
            },
        },
    }


def analyze_interview(*, questions: list, domain: str, role=None, experience_level=None, salary_range=None) -> dict:
    """
    Analyse a completed interview session.
    Tries Ollama batch evaluation first; falls back to heuristic analysis.
    Equivalent to analyzeInterview() in analysis.service.js.
    """
    answered = [q for q in questions if q.get("answerText")]

    if not answered:
        return _build_fallback_report([], domain, role)["report"]

    def _is_generic(s: str) -> bool:
        if not s:
            return True
        sl = s.lower()
        return (
            "answer was submitted" in sl
            or "ai evaluation temporarily" in sl
            or "please retry" in sl
        )

    def _clean_list(arr, fallback):
        if isinstance(arr, list) and len([s for s in arr if not _is_generic(s)]) >= 2:
            return [s for s in arr if not _is_generic(s)]
        return fallback

    try:
        logger.info("🧠 Starting batch evaluation for %d answers...", len(answered))
        result = batch_evaluate_interview(
            questions=answered,
            domain=domain,
            role=role,
            experience_level=experience_level,
            salary_range=salary_range,
        )

        # Attach per-answer evaluations back onto question objects
        for i, q in enumerate(answered):
            if i < len(result["perAnswerEvaluations"]):
                q["evaluation"] = result["perAnswerEvaluations"][i]

        fallback = _build_fallback_report(answered, domain, role)
        report = result["report"]

        return {
            **report,
            "topStrengths":    _clean_list(report.get("topStrengths"),    fallback["report"]["topStrengths"]),
            "topImprovements": _clean_list(report.get("topImprovements"), fallback["report"]["topImprovements"]),
            "recommendations": (
                report.get("recommendations")
                if isinstance(report.get("recommendations"), list) and report["recommendations"]
                else fallback["report"]["recommendations"]
            ),
        }

    except Exception as exc:
        logger.error("analyzeInterview Ollama batch eval failed — using smart fallback: %s", exc)
        fallback = _build_fallback_report(answered, domain, role)
        for i, q in enumerate(answered):
            if i < len(fallback["perAnswerEvaluations"]):
                q["evaluation"] = fallback["perAnswerEvaluations"][i]
        return fallback["report"]
