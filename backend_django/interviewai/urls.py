"""Root URL configuration for InterviewAI."""
from django.urls import path, include
from django.http import JsonResponse
from datetime import datetime

SERVER_START_TIME = datetime.utcnow().isoformat() + "Z"


def health_check(request):
    return JsonResponse({"status": "ok", "startTime": SERVER_START_TIME, "ts": datetime.utcnow().isoformat() + "Z"})


def index(request):
    from django.http import HttpResponse
    return HttpResponse("InterviewAI ✓")


urlpatterns = [
    path("", index),
    path("api/health", health_check),
    path("api/auth/",      include("apps.auth_app.urls")),
    path("api/user/",      include("apps.users.urls")),
    path("api/interview/", include("apps.sessions.urls")),
    path("api/guest/",     include("apps.guest.urls")),
    path("api/admin/",     include("apps.admin_panel.urls")),
    path("api/resume/",    include("apps.users.resume_urls")),
    path("api/payments/",  include("apps.payments.urls")),
]
