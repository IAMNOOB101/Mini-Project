"""Session + history URL patterns (mounted at /api/interview/)."""
from django.urls import path
from .views import StartView, SubmitView, QuestionView, HistoryView, TranscriptView, SetupView

urlpatterns = [
    path("setup",                        SetupView.as_view()),
    path("sessions",                     HistoryView.as_view()),
    path("report/<str:session_id>",      TranscriptView.as_view()),
    path("session/start",                StartView.as_view()),
    path("session/submit",               SubmitView.as_view()),
    path("session/question/<str:session_id>", QuestionView.as_view()),
]
