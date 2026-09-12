"""
sessions/views.py
Port of session.controller.js + history.controller.js.
Background tasks use threading.Thread (fire-and-forget, same as Node.js async).
"""
import logging
import threading
from datetime import datetime, timedelta, timezone

from django.db import transaction
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import InterviewSession
from apps.users.models import User
from services.ai_service import (
    extract_resume_topics,
    extract_answer_keywords,
    should_continue_interview,
    generate_question,
)
from services.analysis_service import analyze_interview
from services.email_service import send_interview_completion_email, send_transcription_email
from services.resume_parser import parse_resume
from services.clean_transcript import clean_transcript
from interviewai.permissions import IsAuthenticatedUser

import requests as http_requests

logger = logging.getLogger(__name__)

INTRO_QUESTION = (
    "Tell me about yourself — walk me through your background, "
    "what you're working on currently, and what excites you most about your domain."
)


class StartView(APIView):
    """POST /api/interview/session/start — port of startInterview()"""
    permission_classes = [IsAuthenticatedUser]

    def post(self, request):
        try:
            user = User.objects.get(pk=request.user.id)
        except User.DoesNotExist:
            return Response({"message": "User not found"}, status=404)

        if user.account_type == "guest" and user.used_guest_interview:
            return Response({
                "message": "Guest interview already used. Please register for full access."
            }, status=403)

        profile          = user.interview_profile or {}
        domain           = profile.get("domain") or user.domain
        experience_level = profile.get("experienceLevel") if profile.get("experienceLevel") is not None else user.experience

        if not domain or experience_level is None:
            return Response({
                "message": "Please complete your interview profile (domain + experience level) first."
            }, status=400)

        if user.account_type != "guest" and not user.resume_url:
            logger.warning("⚠️ User %s starting interview without resume — using profile data only", user.id)

        # forceNew: abandon old active session
        if request.data.get("forceNew"):
            InterviewSession.objects.filter(user=user, completed=False).update(
                completed=True, transcript_locked=True
            )

        # Resume active session
        active = InterviewSession.objects.filter(user=user, completed=False).first()
        if active:
            meta = (active.final_report or {}).get("_meta", {})
            q    = active.questions[active.current_question_index] if active.questions else None
            if q and q.get("questionText"):
                return Response({
                    "sessionId":     active.id,
                    "question":      q["questionText"],
                    "questionNumber": active.current_question_index + 1,
                    "totalTopics":   len(meta.get("resumeTopics", [])),
                    "resumed":       True,
                })
            return Response({
                "sessionId":         active.id,
                "question":          None,
                "questionNumber":    active.current_question_index + 1,
                "totalTopics":       len(meta.get("resumeTopics", [])),
                "resumed":           True,
                "generatingQuestion": True,
            })

        # Parse resume
        resume_text = None
        if user.resume_url:
            try:
                resp = http_requests.get(user.resume_url, timeout=15)
                resp.raise_for_status()
                resume_text = parse_resume(resp.content)
                logger.info("✅ Resume parsed, length: %d", len(resume_text or ""))
            except Exception as e:
                logger.warning("⚠️ Resume parse failed: %s", e)

        resume_topics    = extract_resume_topics(resume_text, user.skills, domain)
        role             = profile.get("role") or user.role
        salary_range     = profile.get("salaryRange") or {}
        language         = profile.get("language") or "en"

        session = InterviewSession.objects.create(
            user          = user,
            domain        = domain,
            language      = language,
            salary_range  = salary_range,
            questions     = [{"questionText": INTRO_QUESTION, "topic": "introduction"}],
            current_question_index = 0,
            final_report  = {
                "_meta": {
                    "resumeTopics":   resume_topics,
                    "coveredTopics":  [],
                    "resumeText":     (resume_text or "")[:3000] or None,
                    "role":           role,
                    "experienceLevel": experience_level,
                }
            },
        )

        logger.info(
            "🎯 Interview started: session %d, %d topics planned. Q1 = introduction",
            session.id, len(resume_topics),
        )
        return Response({
            "sessionId":     session.id,
            "question":      INTRO_QUESTION,
            "questionNumber": 1,
            "totalTopics":   len(resume_topics),
        })


class QuestionView(APIView):
    """GET /api/interview/session/question/<sessionId> — port of getCurrentQuestion()"""
    permission_classes = [IsAuthenticatedUser]

    def get(self, request, session_id):
        response_obj = Response()
        response_obj["Cache-Control"] = "no-store, no-cache, must-revalidate"

        try:
            session = InterviewSession.objects.get(pk=session_id)
        except InterviewSession.DoesNotExist:
            return Response({"message": "Session not found"}, status=404)
        if session.user_id != request.user.id:
            return Response({"message": "Access denied"}, status=403)

        idx  = session.current_question_index
        q    = session.questions[idx] if session.questions else None
        meta = (session.final_report or {}).get("_meta", {})

        if q and q.get("questionText"):
            return Response({
                "ready":          True,
                "question":       q["questionText"],
                "questionNumber": idx + 1,
                "totalTopics":    len(meta.get("resumeTopics", [])),
                "coveredTopics":  len(meta.get("coveredTopics", [])),
            })
        return Response({"ready": False, "questionNumber": idx + 1})


class SubmitView(APIView):
    """POST /api/interview/session/submit — port of submitAnswer()"""
    permission_classes = [IsAuthenticatedUser]

    def post(self, request):
        session_id = request.data.get("sessionId")
        raw_answer = request.data.get("answerText")
        confidence = request.data.get("confidence")

        if not session_id or not raw_answer:
            return Response({"message": "sessionId and answerText are required"}, status=400)

        answer_text = clean_transcript(raw_answer)
        if answer_text != raw_answer:
            logger.info("🧹 Transcript cleaned: %d → %d chars", len(raw_answer), len(answer_text))

        try:
            session = InterviewSession.objects.get(pk=session_id)
        except InterviewSession.DoesNotExist:
            return Response({"message": "Session not found"}, status=404)
        if session.user_id != request.user.id:
            return Response({"message": "Access denied"}, status=403)
        if session.completed:
            return Response({"message": "Interview already completed"}, status=400)

        user       = User.objects.get(pk=request.user.id)
        idx        = session.current_question_index
        questions  = list(session.questions)
        meta       = dict((session.final_report or {}).get("_meta", {}))

        # Save answer + extract keywords
        keywords = extract_answer_keywords(answer_text)
        questions[idx] = {
            **questions[idx],
            "answerText":       answer_text,
            "answeredAt":       datetime.now(tz=timezone.utc).isoformat(),
            "confidenceSignals": {
                "voice":  (confidence or {}).get("voice"),
                "facial": (confidence or {}).get("facial"),
            } if confidence else None,
            "keywordsExtracted": keywords,
        }

        answered_count  = idx + 1
        covered_topics  = list(meta.get("coveredTopics", []))
        current_topic   = questions[idx].get("topic")
        if current_topic and current_topic not in covered_topics:
            covered_topics.append(current_topic)
        for kw in keywords[:2]:
            if kw not in covered_topics:
                covered_topics.append(kw)
        meta["coveredTopics"] = covered_topics

        resume_topics     = meta.get("resumeTopics", [])
        remaining_topics  = [
            t for t in resume_topics
            if not any(c.lower().find(t.lower().split(" ")[0]) != -1 for c in covered_topics)
        ]

        logger.info(
            "📝 Q%d answered (%d words). Keywords: [%s]. Covered: %d/%d",
            answered_count, len(answer_text.split()), ", ".join(keywords),
            len(covered_topics), len(resume_topics),
        )

        continue_interview = should_continue_interview(answered_count, len(covered_topics), len(resume_topics))

        if continue_interview:
            next_q_index = len(questions)
            questions.append({"questionText": None, "topic": None, "generating": True})

            session.questions              = questions
            session.current_question_index = next_q_index
            session.final_report           = {**session.final_report, "_meta": meta}
            session.save(update_fields=["questions", "current_question_index", "final_report", "updated_at"])

            response = Response({
                "completed":          False,
                "generatingQuestion": True,
                "questionNumber":     answered_count + 1,
                "coveredTopics":      len(covered_topics),
                "totalTopics":        len(resume_topics),
            })

            # Fire-and-forget background question generation (mirrors Node.js async pattern)
            t = threading.Thread(
                target=_generate_next_question_bg,
                kwargs=dict(
                    session_id    = session.id,
                    questions     = questions,
                    meta          = meta,
                    next_q_index  = next_q_index,
                    answered_count = answered_count,
                    keywords      = keywords,
                    covered_topics = covered_topics,
                    remaining_topics = remaining_topics,
                    user          = user,
                ),
                daemon=True,
            )
            t.start()
            return response

        else:
            logger.info("🏁 Interview complete after %d Qs. Background eval starting...", answered_count)
            session.questions              = questions
            session.current_question_index = idx + 1
            session.completed              = True
            session.transcript_locked      = True
            session.final_report           = {"evaluating": True, "_prevMeta": meta}
            session.expires_at             = datetime.now(tz=timezone.utc) + timedelta(hours=24)
            session.save()

            t = threading.Thread(
                target=_run_background_evaluation,
                kwargs=dict(session_id=session.id, questions=questions, user=user),
                daemon=True,
            )
            t.start()
            return Response({"completed": True, "evaluating": True, "nextQuestion": None, "totalQuestions": answered_count})


# ── Background helpers ────────────────────────────────────────────────────────

def _generate_next_question_bg(
    *, session_id, questions, meta, next_q_index,
    answered_count, keywords, covered_topics, remaining_topics, user
):
    try:
        profile          = (user.interview_profile or {}) if user else {}
        domain           = meta.get("domain") or profile.get("domain") or user.domain if user else "fullstack"
        role             = meta.get("role") or profile.get("role") or (user.role if user else None)
        experience_level = meta.get("experienceLevel") or profile.get("experienceLevel") or (user.experience if user else None)
        salary_range     = meta.get("salaryRange", {})
        language         = meta.get("language", "en")
        resume_text      = meta.get("resumeText")
        next_q_number    = answered_count + 1

        logger.info(
            "🧠 [BG] Generating Q%d (keywords: %s, remaining: %s)...",
            next_q_number,
            ", ".join(keywords[:3]),
            ", ".join(remaining_topics[:3]),
        )

        try:
            next_question = generate_question(
                domain                   = domain,
                role                     = role,
                experience_level         = experience_level,
                salary_range             = salary_range,
                language                 = language,
                resume_text              = resume_text,
                skills                   = user.skills if user else None,
                question_number          = next_q_number,
                existing_questions       = [q["questionText"] for q in questions if q.get("questionText")],
                previous_answer_keywords = keywords,
                covered_topics           = covered_topics,
                remaining_topics         = remaining_topics,
                is_follow_up             = len(keywords) > 0,
            )
        except Exception as e:
            logger.warning("⚠️ [BG] Q%d generation failed, using fallback: %s", next_q_number, e)
            topic = remaining_topics[0] if remaining_topics else (keywords[0] if keywords else "software engineering")
            next_question = (
                f"Walk me through how you've applied {topic} in a real project "
                f"— what was the challenge and what trade-offs did you make?"
            )

        next_topic = remaining_topics[0] if remaining_topics else (keywords[0] if keywords else "deep dive")

        # Re-fetch session to avoid stale data races
        session = InterviewSession.objects.get(pk=session_id)
        updated_questions = list(session.questions)
        updated_questions[next_q_index] = {
            "questionText": next_question,
            "topic":        next_topic,
            "generating":   False,
        }
        session.questions = updated_questions
        session.save(update_fields=["questions", "updated_at"])
        logger.info("✅ [BG] Q%d ready: \"%s...\"", next_q_number, next_question[:80])

    except Exception as exc:
        logger.error("❌ [BG] Q generation failed for session %s: %s", session_id, exc)
        try:
            session = InterviewSession.objects.get(pk=session_id)
            updated_questions = list(session.questions)
            updated_questions[next_q_index] = {
                "questionText": "Describe the most complex technical challenge you've faced recently and how you approached solving it step by step.",
                "topic": "problem-solving",
                "generating": False,
            }
            session.questions = updated_questions
            session.save(update_fields=["questions", "updated_at"])
        except Exception:
            pass


def _run_background_evaluation(*, session_id, questions, user):
    try:
        logger.info("🧠 [BG] Batch evaluating session %d...", session_id)
        session = InterviewSession.objects.get(pk=session_id)

        answered = [q for q in questions if q.get("answerText")]

        synthesis = analyze_interview(
            questions        = answered,
            domain           = session.domain,
            role             = (user.interview_profile or {}).get("role") or (user.role if user else None),
            experience_level = (user.interview_profile or {}).get("experienceLevel") or (user.experience if user else None),
            salary_range     = session.salary_range,
        )

        # Progress insight vs previous session
        progress_insight = None
        if user:
            prev_sessions = (
                InterviewSession.objects
                .filter(user=user, completed=True)
                .order_by("-created_at")[:2]
            )
            prev = next((s for s in prev_sessions if s.id != session_id), None)
            if prev:
                prev_score = (prev.final_report or {}).get("scores", {}).get("overall")
                curr_score = synthesis.get("scores", {}).get("overall")
                if prev_score is not None and curr_score is not None:
                    diff = curr_score - prev_score
                    if diff > 0.5:
                        progress_insight = f"Improved by {diff:.1f} points since your last interview."
                    elif diff < -0.5:
                        progress_insight = f"Score dropped by {abs(diff):.1f} points."
                    else:
                        progress_insight = "Consistent performance with your previous interview."

        final_report = {
            **synthesis,
            "progressInsight": progress_insight,
            "completedAt":     datetime.now(tz=timezone.utc).isoformat(),
            "evaluating":      False,
        }

        session.questions    = questions
        session.final_report = final_report
        session.save(update_fields=["questions", "final_report", "updated_at"])
        logger.info("✅ [BG] Report ready. Overall: %s", synthesis.get("scores", {}).get("overall"))

        if user:
            threading.Thread(
                target=send_interview_completion_email,
                kwargs=dict(
                    to=user.email, name=user.first_name,
                    session_id=session_id,
                    performance_category=synthesis.get("confidenceLevel", "Medium"),
                ),
                daemon=True,
            ).start()
            threading.Thread(
                target=send_transcription_email,
                kwargs=dict(
                    to=user.email, name=user.first_name,
                    session_id=session_id,
                    transcript=questions,
                    report=final_report,
                ),
                daemon=True,
            ).start()
            if user.account_type == "guest":
                user.used_guest_interview = True
                user.save(update_fields=["used_guest_interview"])

    except Exception as exc:
        logger.error("❌ [BG] Eval failed for session %s: %s", session_id, exc)
        try:
            InterviewSession.objects.filter(pk=session_id).update(
                final_report={"evaluating": False, "error": True, "errorMessage": str(exc)}
            )
        except Exception:
            pass


# ── History / Transcript ──────────────────────────────────────────────────────

class HistoryView(APIView):
    """GET /api/interview/sessions — port of getInterviewHistory()"""
    permission_classes = [IsAuthenticatedUser]

    def get(self, request):
        sessions = (
            InterviewSession.objects
            .filter(user_id=request.user.id, completed=True)
            .order_by("-created_at")
        )
        return Response({
            "count": sessions.count(),
            "sessions": [
                {
                    "id":              s.id,
                    "sessionId":       s.id,
                    "date":            s.created_at,
                    "domain":          s.domain,
                    "finalScore":      (s.final_report or {}).get("scores", {}).get("overall"),
                    "confidenceLevel": (s.final_report or {}).get("confidenceLevel"),
                    "finalReport":     s.final_report,
                    "expiresAt":       s.expires_at,
                }
                for s in sessions
            ],
        })


class TranscriptView(APIView):
    """GET /api/interview/report/<session_id> — port of getInterviewTranscript()"""
    permission_classes = [IsAuthenticatedUser]

    def get(self, request, session_id):
        try:
            sid = int(session_id)
        except (TypeError, ValueError):
            return Response({"message": "Invalid interview ID"}, status=400)

        try:
            session = InterviewSession.objects.get(pk=sid)
        except InterviewSession.DoesNotExist:
            return Response({"message": "Interview not found"}, status=404)

        if session.user_id != request.user.id and request.user.account_type != "admin":
            return Response({"message": "Access denied"}, status=403)

        return Response({
            "sessionId":   session.id,
            "startedAt":   session.created_at,
            "completedAt": session.updated_at,
            "domain":      session.domain,
            "transcript":  [
                {
                    "question":    q.get("questionText"),
                    "answer":      q.get("answerText"),
                    "answeredAt":  q.get("answeredAt"),
                    "evaluation":  q.get("evaluation"),
                }
                for q in (session.questions or [])
            ],
            "finalReport": session.final_report,
        })


class SetupView(APIView):
    """POST /api/interview/setup — saves interview configuration and profile"""
    permission_classes = [IsAuthenticatedUser]

    def post(self, request):
        try:
            user = User.objects.get(pk=request.user.id)
        except User.DoesNotExist:
            return Response({"message": "User not found"}, status=404)

        data = request.data
        profile = user.interview_profile or {}
        domain = data.get("domain") or profile.get("domain") or user.domain
        exp = data.get("experienceLevel") or data.get("experience") or profile.get("experienceLevel") or user.experience
        role = data.get("role") or profile.get("role") or user.role
        salary_range = data.get("salaryRange") or profile.get("salaryRange") or user.desired_salary
        language = data.get("language") or profile.get("language") or "en"

        updated_profile = {
            **profile,
            "domain": domain,
            "experienceLevel": exp,
            "role": role,
            "salaryRange": salary_range,
            "language": language,
        }

        user.interview_profile = updated_profile
        if domain:
            user.domain = domain
        if role:
            user.role = role
        if exp is not None:
            user.experience = str(exp)
        if salary_range:
            user.desired_salary = str(salary_range)
        user.save()

        from apps.users.serializers import UserSerializer
        return Response({
            "success": True,
            "message": "Interview profile updated successfully",
            "data": UserSerializer(user).data
        })

