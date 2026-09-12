"""
auth_app/views.py
Port of auth.controller.js + password.controller.js.
Handles: register, login (with TOTP 2-step), guest login, me, logout, TOTP init/confirm/disable, reset-password.
"""
import logging
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.hashers import make_password, check_password
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import User
from services.totp_service import generate_totp_secret, verify_totp_token
from services.cloudinary_service import upload_pdf_to_cloudinary
from services.resume_parser import parse_resume, extract_resume_info
from interviewai.permissions import IsAuthenticatedUser

logger = logging.getLogger(__name__)

JWT_COOKIE_NAME = settings.SIMPLE_JWT.get("AUTH_COOKIE", "token")
COOKIE_SECURE   = settings.SIMPLE_JWT.get("AUTH_COOKIE_SECURE", not settings.DEBUG)
COOKIE_MAX_AGE  = int(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds())


def _make_token(user: User) -> str:
    """Create a JWT access token with user id and account_type claims."""
    refresh = RefreshToken.for_user(user)
    token = refresh.access_token
    token["account_type"] = user.account_type
    token["user_id"] = user.id
    return str(token)


def _set_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        JWT_COOKIE_NAME,
        token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="Lax",
        max_age=COOKIE_MAX_AGE,
    )


def _user_payload(user: User) -> dict:
    return {
        "id":          user.id,
        "firstName":   user.first_name,
        "lastName":    user.last_name,
        "email":       user.email,
        "accountType": user.account_type,
        "totpEnabled": user.totp_enabled,
    }


# ── Register ───────────────────────────────────────────────────────────────────
class RegisterView(APIView):
    """POST /api/auth/register — port of register() in auth.controller.js"""

    def post(self, request):
        data = request.data
        first_name   = data.get("firstName", "").strip()
        last_name    = data.get("lastName", "").strip()
        email        = data.get("email", "").strip().lower()
        password     = data.get("password", "")
        account_type = data.get("accountType", "professional")

        if not first_name or not email or not password:
            return Response({"message": "Missing required fields: firstName, email, password"}, status=400)

        if User.objects.filter(email=email).exists():
            return Response({"message": "Email already registered"}, status=409)

        # Handle optional resume upload
        resume_url  = None
        resume_data = {}
        resume_file = request.FILES.get("resume")
        if resume_file:
            try:
                file_buffer = resume_file.read()
                result = upload_pdf_to_cloudinary(file_buffer, f"resume_{email}_{resume_file.name}")
                resume_url = result["secure_url"]
                try:
                    text = parse_resume(file_buffer)
                    resume_data = extract_resume_info(text)
                except Exception:
                    logger.info("Resume parsing failed during signup, continuing")
            except Exception as e:
                logger.info("Resume upload failed during signup, continuing: %s", e)

        user = User.objects.create(
            first_name   = first_name,
            last_name    = last_name,
            email        = email,
            password     = make_password(password),
            account_type = account_type,
            resume_url   = resume_url,
            resume_data  = resume_data or {},
        )

        token = _make_token(user)
        response = Response({
            "success": True,
            "message": "Registration successful",
            "token":   token,
            "user":    {"id": user.id, "firstName": user.first_name, "email": user.email},
        }, status=201)
        _set_cookie(response, token)
        return response


# ── Login ──────────────────────────────────────────────────────────────────────
class LoginView(APIView):
    """POST /api/auth/login — port of login() in auth.controller.js"""

    def post(self, request):
        email      = (request.data.get("email") or "").strip().lower()
        password   = request.data.get("password", "")
        totp_token = request.data.get("totpToken", "")

        if not email:
            return Response({"message": "Email required"}, status=400)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"message": "User not found"}, status=401)

        # Scenario 1: Initial email check (no password, no token)
        if not password and not totp_token:
            if user.totp_enabled:
                return Response({"totpRequired": True, "message": "Enter your authenticator code"})
            return Response({"passwordRequired": True, "message": "Enter your password"})

        # Scenario 2: TOTP-only login (passwordless)
        if totp_token and not password:
            if not user.totp_enabled:
                return Response({"message": "TOTP not enabled for this account"}, status=400)
            if not verify_totp_token(user.totp_secret, totp_token):
                return Response({"message": "Invalid authenticator code"}, status=401)

        # Scenario 3: Password login
        elif password:
            if not check_password(password, user.password):
                return Response({"message": "Invalid credentials"}, status=401)

        token = _make_token(user)
        response = Response({"token": token, "user": _user_payload(user)})
        _set_cookie(response, token)
        return response


# ── Guest Login ────────────────────────────────────────────────────────────────
class GuestLoginView(APIView):
    """POST /api/auth/guest — port of guestLogin() in auth.controller.js"""

    def post(self, request):
        from rest_framework_simplejwt.tokens import AccessToken
        token = AccessToken()
        token["user_id"]      = None
        token["account_type"] = "guest"
        token_str = str(token)
        response = Response({"token": token_str})
        _set_cookie(response, token_str)
        return response


# ── Me ─────────────────────────────────────────────────────────────────────────
class MeView(APIView):
    """GET /api/auth/me — port of getMe() in auth.controller.js"""
    permission_classes = [IsAuthenticatedUser]

    def get(self, request):
        if request.user.account_type == "guest":
            return Response({"user": {"id": None, "accountType": "guest", "firstName": "Guest", "lastName": "User"}})
        try:
            user = User.objects.get(pk=request.user.id)
        except User.DoesNotExist:
            return Response({"message": "User not found"}, status=404)

        from apps.users.serializers import UserSerializer
        return Response({"user": UserSerializer(user).data})


# ── Logout ─────────────────────────────────────────────────────────────────────
class LogoutView(APIView):
    """POST /api/auth/logout"""

    def post(self, request):
        response = Response({"message": "Logged out"})
        response.delete_cookie(JWT_COOKIE_NAME)
        return response


# ── TOTP Init ──────────────────────────────────────────────────────────────────
class TotpInitView(APIView):
    """POST /api/auth/totp/init — port of initTotp() in auth.controller.js"""
    permission_classes = [IsAuthenticatedUser]

    def post(self, request):
        try:
            user = User.objects.get(pk=request.user.id)
        except User.DoesNotExist:
            return Response({"message": "User not found"}, status=404)
        if user.totp_enabled:
            return Response({"message": "TOTP already enabled"}, status=400)
        result = generate_totp_secret(user.email)
        user.totp_secret = result["secret"]
        user.save(update_fields=["totp_secret"])
        return Response({"qrCode": result["qrCode"], "message": "Scan with Google Authenticator then confirm at /auth/totp/confirm"})


# ── TOTP Confirm ───────────────────────────────────────────────────────────────
class TotpConfirmView(APIView):
    """POST /api/auth/totp/confirm — port of confirmTotp() in auth.controller.js"""
    permission_classes = [IsAuthenticatedUser]

    def post(self, request):
        token = request.data.get("token")
        try:
            user = User.objects.get(pk=request.user.id)
        except User.DoesNotExist:
            return Response({"message": "User not found"}, status=404)
        if not user.totp_secret:
            return Response({"message": "Run /auth/totp/init first"}, status=400)
        if not verify_totp_token(user.totp_secret, token):
            return Response({"message": "Invalid code — try again"}, status=401)
        user.totp_enabled = True
        user.save(update_fields=["totp_enabled"])
        return Response({"message": "Two-factor authentication enabled"})


# ── TOTP Disable ───────────────────────────────────────────────────────────────
class TotpDisableView(APIView):
    """POST /api/auth/totp/disable — port of disableTotp() in auth.controller.js"""
    permission_classes = [IsAuthenticatedUser]

    def post(self, request):
        password = request.data.get("password", "")
        try:
            user = User.objects.get(pk=request.user.id)
        except User.DoesNotExist:
            return Response({"message": "User not found"}, status=404)
        if not check_password(password, user.password):
            return Response({"message": "Wrong password"}, status=401)
        user.totp_secret  = None
        user.totp_enabled = False
        user.save(update_fields=["totp_secret", "totp_enabled"])
        return Response({"message": "Two-factor authentication disabled"})


# ── Reset Password ─────────────────────────────────────────────────────────────
class ResetPasswordView(APIView):
    """POST /api/auth/reset-password — port of resetPassword() in password.controller.js"""

    def post(self, request):
        email        = (request.data.get("email") or "").strip().lower()
        new_password = request.data.get("newPassword", "")
        if not email or not new_password:
            return Response({"message": "email and newPassword are required"}, status=400)
        if len(new_password) < 8:
            return Response({"message": "Password must be at least 8 characters"}, status=400)
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"message": "No account with that email"}, status=404)
        user.password = make_password(new_password)
        user.save(update_fields=["password"])
        return Response({"message": "Password updated successfully"})
