"""Auth app URL patterns."""
from django.urls import path
from .views import (
    RegisterView, LoginView, GuestLoginView, MeView, LogoutView,
    TotpInitView, TotpConfirmView, TotpDisableView, ResetPasswordView,
)

urlpatterns = [
    path("register",      RegisterView.as_view()),
    path("login",         LoginView.as_view()),
    path("guest",         GuestLoginView.as_view()),
    path("me",            MeView.as_view()),
    path("logout",        LogoutView.as_view()),
    path("totp/init",     TotpInitView.as_view()),
    path("totp/confirm",  TotpConfirmView.as_view()),
    path("totp/disable",  TotpDisableView.as_view()),
    path("reset-password", ResetPasswordView.as_view()),
]
