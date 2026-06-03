/**
 * Analyse a completed interview session and return a rich, specific report.
 * Called by session.controller.js after the final answer is submitted.
 *
 * Strategy:
 * 1. Try Ollama batch evaluation for a holistic AI-generated analysis (best quality)
 * 2. If Ollama fails (timeout / error), fall back to a smart aggregation
 *    of local clarity scores and heuristic data — producing real, specific feedback
 *    instead of generic placeholders.
 */

import { batchEvaluateInterview, computeLocalClarityScore } from "./ai.service.js";

// ── Smart fallback builder ──────────────────────────────────────────────────
/**
 * Build a real analysis report purely from local heuristic data.
 * Used when Ollama is unavailable (timeout, error, etc.)
 */
function buildFallbackReport({ answered, domain, role }) {
  // Compute local clarity for each answer
  const clarityData = answered.map((q) => computeLocalClarityScore(q.answerText));
  const avgClarity = clarityData.reduce((s, c) => s + c.clarityScore, 0) / (clarityData.length || 1);

  // Estimate content score from word count and tech terms (rough heuristic)
  const contentEstimates = answered.map((q) => {
    const wc = q.answerText?.trim().split(/\s+/).length ?? 0;
    const techTerms = /\b(function|class|api|database|algorithm|complexity|cache|async|thread|memory|server|client|request|response|component|module|interface|architecture)\b/gi;
    const techCount = (q.answerText?.match(techTerms) || []).length;
    if (wc < 15) return 2;
    if (wc < 30) return 3 + Math.min(2, techCount);
    if (techCount >= 3) return 6 + Math.min(2, Math.floor(techCount / 3));
    return 4;
  });
  const avgContent = contentEstimates.reduce((s, v) => s + v, 0) / (contentEstimates.length || 1);

  // Voice confidence from signals
  const confScores = answered.map((q) => {
    const v = q.confidenceSignals?.voice;
    return v != null ? Math.min(10, Math.max(1, v)) : 5;
  });
  const avgConfidence = confScores.reduce((s, v) => s + v, 0) / (confScores.length || 1);

  const avgOverall = avgContent * 0.5 + avgClarity * 0.3 + avgConfidence * 0.2;

  // Build per-answer evaluations for the transcript
  const perAnswerEvaluations = answered.map((q, i) => {
    const wc = q.answerText?.trim().split(/\s+/).length ?? 0;
    const isShort = wc < 15;
    const content = isShort ? Math.min(contentEstimates[i], 3) : contentEstimates[i];
    const clarity = isShort ? Math.min(clarityData[i].clarityScore, 3) : clarityData[i].clarityScore;
    const conf = isShort ? Math.min(confScores[i], 4) : confScores[i];
    const overall = Math.round((content * 0.5 + clarity * 0.3 + conf * 0.2) * 10) / 10;

    return {
      contentScore: content,
      clarityScore: clarity,
      confidenceScore: conf,
      overallScore: overall,
      strengths: wc >= 50 ? ["Provided a detailed response"] : ["Attempted to answer"],
      improvements: isShort
        ? ["Answer too brief — expand with examples and reasoning"]
        : ["Add more specific technical details"],
    };
  });

  // Build summary
  const perfLabel = avgOverall >= 8 ? "strong" : avgOverall >= 6 ? "solid" : avgOverall >= 4 ? "moderate" : "weak";
  const contentNote = avgContent < 5
    ? "Technical accuracy and depth need significant improvement."
    : avgContent < 7
    ? "Technical content was partially correct but lacked depth in several areas."
    : "Technical content was generally accurate and well-explained.";

  const clarityNote = avgClarity < 5
    ? "Answers were often unclear or poorly structured."
    : avgClarity < 7
    ? "Clarity was adequate but could benefit from more structured responses."
    : "Communication was clear and well-organized.";

  const summary = `Completed ${answered.length} questions in ${role || domain} with an overall score of ${avgOverall.toFixed(1)}/10 — a ${perfLabel} performance. ${contentNote} ${clarityNote}`;

  // Strengths
  const topStrengths = [];
  if (avgClarity >= 6) topStrengths.push("Clear and structured communication throughout the interview");
  if (avgContent >= 6) topStrengths.push("Demonstrated solid technical knowledge in core areas");
  if (avgConfidence >= 6) topStrengths.push("Confident delivery and consistent speaking pace");
  if (topStrengths.length === 0) topStrengths.push("Made an effort to answer all questions presented");

  // Improvements
  const topImprovements = [];
  if (avgContent < 6) topImprovements.push("Deepen technical knowledge — answers lacked precision and factual accuracy");
  if (avgClarity < 6) topImprovements.push("Structure answers more clearly — use concept → example → trade-offs flow");
  if (avgContent < 7) topImprovements.push("Provide concrete, specific examples from real projects");
  const shortAnswers = answered.filter((q) => (q.answerText?.trim().split(/\s+/).length ?? 0) < 30);
  if (shortAnswers.length > 0) {
    topImprovements.push(`Expand answers — ${shortAnswers.length} answer(s) were too brief`);
  }
  if (topImprovements.length === 0) topImprovements.push("Continue practicing to maintain performance");

  // Recommendations
  const recommendations = [];
  if (avgContent < 6) recommendations.push(`Study core ${domain} fundamentals using official documentation and courses`);
  if (avgClarity < 6) recommendations.push("Practice the STAR method and record yourself answering questions");
  if (avgOverall < 7) recommendations.push("Do 2-3 mock interviews per week on platforms like Pramp or Interviewing.io");
  recommendations.push("Review the specific questions where you scored lowest and write out comprehensive answers");

  const level = avgConfidence > 7 ? "High" : avgConfidence >= 5 ? "Medium" : "Low";

  const salaryReadiness = avgOverall >= 7
    ? `With an overall score of ${avgOverall.toFixed(1)}/10, performance is on track for the target salary range.`
    : `An overall score of ${avgOverall.toFixed(1)}/10 suggests further preparation is needed before targeting the expected salary range.`;

  const keyInsight = topImprovements[0]
    ? `Priority focus: ${topImprovements[0]}`
    : "Focus on providing concrete examples and specific technical details in every answer.";

  return {
    perAnswerEvaluations,
    report: {
      summary,
      topStrengths: topStrengths.slice(0, 3),
      topImprovements: topImprovements.slice(0, 3),
      recommendations: recommendations.slice(0, 3),
      confidenceLevel: level,
      salaryReadiness,
      keyInsight,
      scores: {
        content: parseFloat(avgContent.toFixed(2)),
        clarity: parseFloat(avgClarity.toFixed(2)),
        confidence: parseFloat(avgConfidence.toFixed(2)),
        overall: parseFloat(avgOverall.toFixed(2)),
      },
    },
  };
}


// ── Main export ─────────────────────────────────────────────────────────────

export const analyzeInterview = async ({ questions, domain, role, experienceLevel, salaryRange }) => {
  const answered = questions.filter((q) => q.answerText);

  if (answered.length === 0) {
    return buildFallbackReport({ answered: [], domain, role }).report;
  }

  try {
    console.log(`🧠 Starting batch evaluation for ${answered.length} answers...`);

    const result = await batchEvaluateInterview({
      questions: answered,
      domain,
      role,
      experienceLevel,
      salaryRange,
    });

    // Attach per-answer evaluations back onto the question objects
    // so they appear in the transcript
    answered.forEach((q, i) => {
      if (result.perAnswerEvaluations[i]) {
        q.evaluation = result.perAnswerEvaluations[i];
      }
    });

    // Filter out generic AI fallback strings
    const isGeneric = (s) =>
      !s ||
      s.toLowerCase().includes("answer was submitted") ||
      s.toLowerCase().includes("ai evaluation temporarily") ||
      s.toLowerCase().includes("please retry");

    const cleanList = (arr, fallbackArr) =>
      Array.isArray(arr) && arr.filter((s) => !isGeneric(s)).length >= 2
        ? arr.filter((s) => !isGeneric(s))
        : fallbackArr;

    const fallback = buildFallbackReport({ answered, domain, role });

    return {
      ...result.report,
      topStrengths: cleanList(result.report.topStrengths, fallback.report.topStrengths),
      topImprovements: cleanList(result.report.topImprovements, fallback.report.topImprovements),
      recommendations: Array.isArray(result.report.recommendations) && result.report.recommendations.length > 0
        ? result.report.recommendations
        : fallback.report.recommendations,
    };
  } catch (err) {
    console.error("analyzeInterview Ollama batch eval failed — using smart fallback:", err.message);

    // Smart fallback: real feedback from local heuristic data
    const fallback = buildFallbackReport({ answered, domain, role });

    // Attach fallback per-answer evaluations
    answered.forEach((q, i) => {
      if (fallback.perAnswerEvaluations[i]) {
        q.evaluation = fallback.perAnswerEvaluations[i];
      }
    });

    return fallback.report;
  }
};
