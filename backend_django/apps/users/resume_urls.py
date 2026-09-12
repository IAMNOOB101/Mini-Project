"""Resume URL patterns (mounted at /api/resume/)."""
from django.urls import path
from .views import ResumeUploadView, ResumeView, ResumeParsePublicView

urlpatterns = [
    path("upload", ResumeUploadView.as_view()),
    path("",       ResumeView.as_view()),
    path("parse",  ResumeParsePublicView.as_view()),
]
