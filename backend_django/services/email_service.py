"""
email_service.py
Python port of email.service.js.
Uses Django's built-in email backend (SMTP/Gmail).
"""
import logging
from django.conf import settings
from django.core.mail import send_mail, EmailMessage

logger = logging.getLogger(__name__)

CLIENT_URL = getattr(settings, "CLIENT_URL", "http://localhost:5173")


def _email_configured() -> bool:
    return bool(getattr(settings, "EMAIL_HOST_USER", ""))


def send_interview_completion_email(*, to: str, name: str, session_id: int, performance_category: str) -> None:
    """
    Send interview completion notification.
    Equivalent to sendInterviewCompletionEmail() in email.service.js.
    """
    try:
        if not _email_configured():
            logger.info("Simulating Interview Completion Email to %s", to)
            return

        html = f"""
        <p>Hi {name or 'there'},</p>
        <p>Your interview has been successfully completed.</p>
        <p><strong>Overall Performance:</strong> {performance_category}</p>
        <p>You can view your transcript and insights anytime:</p>
        <p><a href="{CLIENT_URL}/history/{session_id}">View Interview Transcript</a></p>
        <br/>
        <p>– Team InterviewAI</p>
        """

        msg = EmailMessage(
            subject="Your InterviewAI interview is complete 🎉",
            body=html,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[to],
        )
        msg.content_subtype = "html"
        msg.send()
    except Exception as exc:
        logger.error("Email failed: %s", exc)


def send_verification_email(email: str, otp: str) -> None:
    """
    Send OTP verification email.
    Equivalent to sendVerificationEmail() in email.service.js.
    """
    try:
        if not _email_configured():
            logger.info("Simulating Verification Email to %s OTP: %s", email, otp)
            return
        send_mail(
            subject="Verify your institutional email",
            message=f"Your verification code is: {otp}",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
        )
    except Exception as exc:
        logger.error("Email failed: %s", exc)


def send_transcription_email(*, to: str, name: str, session_id: int, transcript: list, report: dict) -> None:
    """
    Send full interview transcript + report email.
    Equivalent to sendTranscriptionEmail() in email.service.js.
    """
    try:
        if not _email_configured():
            logger.info("Simulating Transcription Email to %s", to)
            return

        transcript_html = "".join(
            f"""
            <div style="margin-bottom:1.5rem;padding:1rem;border-left:3px solid #6366f1;background:#f8fafc;">
              <p style="font-weight:700;color:#1e293b;margin:0 0 0.5rem">Q{i+1}: {q.get('questionText','')}</p>
              <p style="color:#475569;margin:0 0 0.5rem">{q.get('answerText','')}</p>
              {f"<p style='font-size:0.85em;color:#64748b'>Score: {q['evaluation']['overallScore']}/10 — {', '.join(q['evaluation'].get('strengths', []))}</p>" if q.get('evaluation') else ""}
            </div>
            """
            for i, q in enumerate([x for x in (transcript or []) if x.get("answerText")])
        )

        scores = (report or {}).get("scores", {})
        strengths = "".join(f"<li>{s}</li>" for s in (report or {}).get("topStrengths", []))
        improvements = "".join(f"<li>{s}</li>" for s in (report or {}).get("topImprovements", []))
        recommendations = "".join(f"<li>{s}</li>" for s in (report or {}).get("recommendations", []))

        score_rows = "".join(
            f"""
            <tr>
              <td style="padding:0.5rem;border-bottom:1px solid #e2e8f0;text-transform:capitalize;font-weight:600">{k}</td>
              <td style="padding:0.5rem;border-bottom:1px solid #e2e8f0">{scores.get(k, '—')} / 10</td>
              <td style="padding:0.5rem;border-bottom:1px solid #e2e8f0">
                <div style="background:#e2e8f0;border-radius:999px;height:8px;width:150px">
                  <div style="background:#6366f1;height:100%;border-radius:999px;width:{((scores.get(k) or 0) / 10) * 100}%"></div>
                </div>
              </td>
            </tr>
            """
            for k in ["overall", "content", "clarity", "confidence"]
        )

        summary_section = f'<h2 style="border-bottom:2px solid #6366f1;padding-bottom:0.5rem">💡 Summary</h2><p>{report.get("summary","")}</p>' if report and report.get("summary") else ""
        salary_section = f'<p><strong>Salary Readiness:</strong> {report.get("salaryReadiness","")}</p>' if report and report.get("salaryReadiness") else ""
        insight_section = f'<div style="background:#f0f9ff;border-left:4px solid #0ea5e9;padding:1rem;border-radius:0 8px 8px 0;margin:1rem 0"><strong>💡 Key Insight:</strong> {report.get("keyInsight","")}</div>' if report and report.get("keyInsight") else ""

        html = f"""
        <div style="font-family:Inter,Arial,sans-serif;max-width:700px;margin:0 auto;color:#1e293b">
          <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:2rem;border-radius:12px 12px 0 0;text-align:center">
            <h1 style="color:#fff;margin:0;font-size:1.8rem">🎯 InterviewAI</h1>
            <p style="color:rgba(255,255,255,0.85);margin:0.5rem 0 0">Interview Complete — Full Report &amp; Transcript</p>
          </div>
          <div style="background:#fff;padding:2rem;border:1px solid #e2e8f0;border-top:none">
            <p>Hi <strong>{name or 'there'}</strong>,</p>
            <p>Congratulations on completing your mock interview! Here's your full session report and transcription.</p>
            <h2 style="border-bottom:2px solid #6366f1;padding-bottom:0.5rem">📊 Performance Scores</h2>
            <table style="width:100%;border-collapse:collapse;margin-bottom:1.5rem">{score_rows}</table>
            {summary_section}
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.5rem">
              <div><h3 style="color:#059669">✅ Strengths</h3><ul style="padding-left:1.2rem;line-height:2">{strengths}</ul></div>
              <div><h3 style="color:#d97706">🚀 Areas to Improve</h3><ul style="padding-left:1.2rem;line-height:2">{improvements}</ul></div>
            </div>
            {'<h3>📌 Recommendations</h3><ul style="padding-left:1.2rem;line-height:2">' + recommendations + '</ul>' if recommendations else ''}
            {salary_section}
            {insight_section}
            <h2 style="border-bottom:2px solid #6366f1;padding-bottom:0.5rem;margin-top:2rem">📝 Full Transcript</h2>
            {transcript_html or '<p>No transcript available.</p>'}
            <div style="text-align:center;margin-top:2rem">
              <a href="{CLIENT_URL}/report/{session_id}"
                 style="background:#6366f1;color:#fff;padding:0.75rem 2rem;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
                View Online Report →
              </a>
            </div>
          </div>
          <div style="background:#f8fafc;padding:1rem;border-radius:0 0 12px 12px;text-align:center;color:#64748b;font-size:0.85rem">
            <p>InterviewAI · Your AI-Powered Interview Coach</p>
          </div>
        </div>
        """

        msg = EmailMessage(
            subject=f"Your InterviewAI Transcript & Report — Session {session_id}",
            body=html,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[to],
        )
        msg.content_subtype = "html"
        msg.send()
    except Exception as exc:
        logger.error("Transcription email failed: %s", exc)
