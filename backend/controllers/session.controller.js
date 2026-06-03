import { InterviewSession, User } from "../db/index.js";
import {
  generateQuestion,
  extractResumeTopics,
  extractAnswerKeywords,
  shouldContinueInterview,
} from "../services/ai.service.js";
import { analyzeInterview } from "../services/analysis.service.js";
import {
  sendInterviewCompletionEmail,
  sendTranscriptionEmail,
} from "../services/email.service.js";
import { parseResume } from "../services/resumeParser.js";
import { cleanTranscript } from "../utils/cleanTranscript.js";
import fetch from "node-fetch";

export const startInterview = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.accountType === "guest" && user.usedGuestInterview)
      return res.status(403).json({
        message: "Guest interview already used. Please register for full access.",
      });

    const profile = user.interviewProfile || {};
    const domain = profile.domain || user.domain;
    const experienceLevel = profile.experienceLevel ?? user.experience;
    if (!domain || (experienceLevel == null && experienceLevel !== 0))
      return res.status(400).json({
        message: "Please complete your interview profile (domain + experience level) first.",
      });

    if (user.accountType !== "guest" && !user.resumeURL)
      return res.status(400).json({
        message: "Please upload your resume before starting an interview.",
      });

    // Resume open active session
    const active = await InterviewSession.findOne({
      where: { userId: user.id, completed: false },
    });
    if (active) {
      const q = active.questions[active.currentQuestionIndex];
      const meta = active.finalReport?._meta || {};
      return res.json({
        sessionId: active.id,
        question: q?.questionText || null,
        questionNumber: active.currentQuestionIndex + 1,
        totalTopics: meta.resumeTopics?.length || 0,
        resumed: true,
      });
    }

    // Parse resume
    let resumeText = null;
    if (user.resumeURL) {
      try {
        const response = await fetch(user.resumeURL);
        if (!response.ok) throw new Error(`Failed to fetch resume: ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();
        resumeText = await parseResume(Buffer.from(arrayBuffer));
        console.log("✅ Resume parsed, length:", resumeText?.length);
      } catch (err) {
        console.warn("⚠️ Resume parse failed:", err.message);
      }
    }

    // Extract topic plan from resume + skills
    const resumeTopics = extractResumeTopics(resumeText, user.skills, domain);

    // Generate ONLY Q1 — adaptive questions generated on each answer submit
    const role = profile.role || user.role || null;
    const salaryRange = profile.salaryRange || {};
    const language = profile.language || "en";

    const firstQuestion = await generateQuestion({
      domain,
      role,
      experienceLevel,
      salaryRange,
      language,
      resumeText,
      skills: user.skills || null,
      questionNumber: 1,
      existingQuestions: [],
      previousAnswerKeywords: [],
      coveredTopics: [],
      remainingTopics: resumeTopics.slice(0, 8),
    }).catch((err) => {
      console.warn("⚠️ Q1 generation failed, using fallback:", err.message);
      return `Tell me about yourself and walk me through a significant technical project you've worked on in ${domain}.`;
    });

    const session = await InterviewSession.create({
      userId: user.id,
      domain,
      language,
      salaryRange,
      questions: [{ questionText: firstQuestion, topic: "introduction" }],
      currentQuestionIndex: 0,
      finalReport: {
        _meta: {
          resumeTopics,
          coveredTopics: [],
          resumeText: resumeText?.slice(0, 3000) || null, // store truncated for later use
          role,
          experienceLevel,
        },
      },
    });

    console.log(`🎯 Interview started: session ${session.id}, ${resumeTopics.length} topics planned`);
    return res.json({
      sessionId: session.id,
      question: firstQuestion,
      questionNumber: 1,
      totalTopics: resumeTopics.length,
    });
  } catch (err) {
    console.error("startInterview error:", err);
    res.status(500).json({ message: "Failed to start interview", error: err.message });
  }
};

export const submitAnswer = async (req, res) => {
  const { sessionId, answerText: rawAnswer, confidence } = req.body;

  if (!sessionId || !rawAnswer)
    return res.status(400).json({ message: "sessionId and answerText are required" });

  const answerText = cleanTranscript(rawAnswer);
  if (answerText !== rawAnswer) {
    console.log(`🧹 Transcript cleaned: ${rawAnswer.length} → ${answerText.length} chars`);
  }

  try {
    const session = await InterviewSession.findByPk(sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });
    if (session.userId !== req.user.id) return res.status(403).json({ message: "Access denied" });
    if (session.completed) return res.status(400).json({ message: "Interview already completed" });

    const user = await User.findByPk(req.user.id);
    const idx = session.currentQuestionIndex;
    const questions = [...session.questions];
    const meta = session.finalReport?._meta || {};

    // Save answer + extract keywords for next question
    const keywords = extractAnswerKeywords(answerText);
    questions[idx] = {
      ...questions[idx],
      answerText,
      answeredAt: new Date().toISOString(),
      confidenceSignals: confidence
        ? { voice: confidence.voice ?? null, facial: confidence.facial ?? null }
        : null,
      keywordsExtracted: keywords,
    };

    const answeredCount = idx + 1;

    // Update covered topics — mark this question's topic as covered
    const coveredTopics = [...(meta.coveredTopics || [])];
    const currentTopic = questions[idx].topic;
    if (currentTopic && !coveredTopics.includes(currentTopic)) {
      coveredTopics.push(currentTopic);
    }
    // Also mark any keyword from this answer as partially covered
    for (const kw of keywords.slice(0, 2)) {
      if (!coveredTopics.includes(kw)) coveredTopics.push(kw);
    }

    const resumeTopics = meta.resumeTopics || [];
    const remainingTopics = resumeTopics.filter(
      (t) => !coveredTopics.some((c) => c.toLowerCase().includes(t.toLowerCase().split(" ")[0]))
    );

    console.log(`📝 Q${answeredCount} answered. Keywords: [${keywords.join(", ")}]. Covered: ${coveredTopics.length}/${resumeTopics.length}`);

    // ── Should interview continue? ──
    const continueInterview = shouldContinueInterview(answeredCount, coveredTopics.length, resumeTopics.length);

    if (continueInterview) {
      // Generate next question adaptively
      const nextQNumber = answeredCount + 1;
      const profile = user?.interviewProfile || {};
      const domain = session.domain;
      const role = meta.role || profile.role || user?.role || null;
      const experienceLevel = meta.experienceLevel ?? profile.experienceLevel ?? user?.experience;
      const salaryRange = session.salaryRange;
      const language = session.language;
      const resumeText = meta.resumeText || null;

      let nextQuestion;
      try {
        nextQuestion = await generateQuestion({
          domain,
          role,
          experienceLevel,
          salaryRange,
          language,
          resumeText,
          skills: user?.skills || null,
          questionNumber: nextQNumber,
          existingQuestions: questions.map((q) => q.questionText),
          previousAnswerKeywords: keywords,
          coveredTopics,
          remainingTopics,
          isFollowUp: keywords.length > 0,
        });
      } catch (err) {
        console.warn("⚠️ Adaptive Q generation failed, using fallback:", err.message);
        const fallbackTopic = remainingTopics[0] || "software engineering best practices";
        nextQuestion = `Walk me through how you approach ${fallbackTopic} in a production environment and a specific challenge you faced with it.`;
      }

      // Determine topic label for next question (based on remaining topics)
      const nextTopic = remainingTopics[0] || keywords[0] || "deep dive";

      questions.push({ questionText: nextQuestion, topic: nextTopic });

      await session.update({
        questions,
        currentQuestionIndex: idx + 1,
        finalReport: {
          _meta: { ...meta, coveredTopics },
        },
      });

      return res.json({
        completed: false,
        nextQuestion,
        questionNumber: nextQNumber,
        coveredTopics: coveredTopics.length,
        totalTopics: resumeTopics.length,
      });

    } else {
      // ── Interview complete ──
      console.log(`🏁 Interview complete after ${answeredCount} questions. Background eval starting...`);

      await session.update({
        questions,
        currentQuestionIndex: idx + 1,
        completed: true,
        transcriptLocked: true,
        finalReport: { evaluating: true, _prevMeta: meta },
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      res.json({ completed: true, evaluating: true, nextQuestion: null, totalQuestions: answeredCount });

      // Fire background evaluation
      runBackgroundEvaluation({ session, questions, user }).catch((err) => {
        console.error("❌ Background evaluation failed:", err.message);
      });
    }
  } catch (err) {
    console.error("submitAnswer error:", err);
    res.status(500).json({ message: "Failed to submit answer", error: err.message });
  }
};

// ── Background evaluation (runs AFTER HTTP response is already sent) ─────────
async function runBackgroundEvaluation({ session, questions, user }) {
  try {
    console.log(`🧠 [BG] Batch evaluating session ${session.id}...`);

    const synthesis = await analyzeInterview({
      questions,
      domain: session.domain,
      role: user?.interviewProfile?.role || user?.role || null,
      experienceLevel: user?.interviewProfile?.experienceLevel ?? user?.experience ?? null,
      salaryRange: session.salaryRange,
    });

    // Progress comparison against most recent OTHER completed session
    const previousSessions = await InterviewSession.findAll({
      where: { userId: session.userId, completed: true },
      order: [["createdAt", "DESC"]],
      limit: 2,
    });
    let progressInsight = null;
    const prevSession = previousSessions.find((s) => s.id !== session.id);
    if (prevSession) {
      const prev = prevSession.finalReport?.scores?.overall;
      if (prev && synthesis.scores?.overall != null) {
        const diff = synthesis.scores.overall - prev;
        if (diff > 0.5)
          progressInsight = `Improved by ${diff.toFixed(1)} points since your last interview. Keep it up!`;
        else if (diff < -0.5)
          progressInsight = `Score dropped by ${Math.abs(diff).toFixed(1)} points. Review the feedback from last time.`;
        else
          progressInsight = "Consistent performance with your previous interview.";
      }
    }

    const finalReport = {
      ...synthesis,
      progressInsight,
      completedAt: new Date().toISOString(),
      evaluating: false,
    };

    await session.update({ questions, finalReport });
    console.log(`✅ [BG] Report ready for session ${session.id}. Overall: ${synthesis.scores?.overall}`);

    if (user) {
      sendInterviewCompletionEmail({
        to: user.email,
        name: user.firstName,
        sessionId: session.id,
        performanceCategory: synthesis.confidenceLevel,
      }).catch(console.error);

      sendTranscriptionEmail({
        to: user.email,
        name: user.firstName,
        sessionId: session.id,
        transcript: questions,
        report: finalReport,
      }).catch(console.error);

      if (user.accountType === "guest") {
        await user.update({ usedGuestInterview: true });
      }
    }
  } catch (err) {
    console.error(`❌ [BG] Evaluation failed for session ${session.id}:`, err.message);
    await session.update({
      finalReport: { evaluating: false, error: true, errorMessage: err.message },
    }).catch(() => {});
  }
}
