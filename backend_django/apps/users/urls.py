"""User profile URL patterns."""
from django.urls import path
from .views import ProfileView, Disable2FAView

urlpatterns = [
    path("profile",            ProfileView.as_view()),
    path("profile/disable-2fa", Disable2FAView.as_view()),
]
