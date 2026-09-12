"""Guest URL patterns."""
from django.urls import path
from .views import GuestStartView

urlpatterns = [
    path("start",           GuestStartView.as_view()),
    path("interview/start", GuestStartView.as_view()),
]

