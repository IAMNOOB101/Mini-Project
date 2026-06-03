// Standalone evaluation endpoint (deprecated — batch evaluation now happens at interview completion)
// Kept for backwards compatibility but redirects to batch evaluation logic.
import { batchEvaluateInterview } from "../services/ai.service.js";

export const evaluateInterviewAnswer = async (req, res) => {
  const { question, answer, domain, language } = req.body;
  if (!question || !answer)
    return res.status(400).json({ message: "question and answer are required" });

  try {
    // Wrap in batch format (single question)
    const result = await batchEvaluateInterview({
      questions: [{ questionText: question, answerText: answer, topic: "general" }],
      domain: domain || "General",
      language: language || "en",
    });
    const evaluation = result.perAnswerEvaluations[0] || {};
    res.json({ evaluation });
  } catch (err) {
    res.status(500).json({ message: "Evaluation failed", error: err.message });
  }
};
