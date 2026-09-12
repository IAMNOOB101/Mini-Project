"""InterviewSession model — maps to 'interview_sessions' table."""
from django.db import models
from django.conf import settings


class InterviewSession(models.Model):
    user                  = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        db_column="userId",
        related_name="sessions",
    )
    is_guest              = models.BooleanField(default=False, db_column="isGuest")
    guest_email           = models.CharField(max_length=255, blank=True, null=True, db_column="guestEmail")
    guest_name            = models.CharField(max_length=255, blank=True, null=True, db_column="guestName")
    domain                = models.CharField(max_length=255, blank=True, null=True)
    language              = models.CharField(max_length=10, default="en")
    salary_range          = models.JSONField(default=dict, db_column="salaryRange")
    questions             = models.JSONField(default=list)
    current_question_index = models.IntegerField(default=0, db_column="currentQuestionIndex")
    completed             = models.BooleanField(default=False)
    transcript_locked     = models.BooleanField(default=False, db_column="transcriptLocked")
    final_report          = models.JSONField(default=dict, db_column="finalReport")
    expires_at            = models.DateTimeField(null=True, blank=True, db_column="expiresAt")
    media_urls            = models.JSONField(default=dict, db_column="mediaURLs")
    created_at            = models.DateTimeField(auto_now_add=True, db_column="createdAt")
    updated_at            = models.DateTimeField(auto_now=True, db_column="updatedAt")

    class Meta:
        db_table = "interview_sessions"

    def __str__(self):
        return f"Session {self.id} (user={self.user_id}, domain={self.domain})"
