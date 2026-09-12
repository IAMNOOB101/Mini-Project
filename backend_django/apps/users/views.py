"""
users/views.py
Port of user.controller.js + resume.controller.js.
Handles: get/update/delete user profile, disable 2FA, resume upload/get/parse.
"""
import logging

from django.contrib.auth.hashers import check_password, make_password
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import User
from .serializers import UserSerializer
from services.cloudinary_service import upload_pdf_to_cloudinary
from services.resume_parser import parse_resume, extract_resume_info, parse_resume_from_buffer
from interviewai.permissions import IsAuthenticatedUser

logger = logging.getLogger(__name__)


class ProfileView(APIView):
    """
    GET  /api/user/profile  — getUserProfile()
    PUT  /api/user/profile  — updateUserProfile()
    DELETE /api/user/profile — deleteUserAccount()
    """
    permission_classes = [IsAuthenticatedUser]

    def get(self, request):
        try:
            user = User.objects.get(pk=request.user.id)
        except User.DoesNotExist:
            return Response({"message": "User not found"}, status=404)
        return Response({"success": True, "data": UserSerializer(user).data})

    def put(self, request):
        try:
            user = User.objects.get(pk=request.user.id)
        except User.DoesNotExist:
            return Response({"message": "User not found"}, status=404)

        data = request.data
        # Check if new email is taken
        new_email = data.get("email", "").strip().lower()
        if new_email and new_email != user.email:
            if User.objects.filter(email=new_email).exclude(pk=user.pk).exists():
                return Response({"message": "Email already in use"}, status=409)

        # Update text fields (only if provided and non-null)
        field_map = {
            "firstName":     "first_name",
            "lastName":      "last_name",
            "email":         "email",
            "phone":         "phone",
            "domain":        "domain",
            "role":          "role",
            "experience":    "experience",
            "skills":        "skills",
            "education":     "education",
            "bio":           "bio",
            "desiredSalary": "desired_salary",
        }
        for js_key, py_attr in field_map.items():
            val = data.get(js_key)
            if val is not None:
                setattr(user, py_attr, val)

        # Handle optional resume upload
        resume_file = request.FILES.get("resume")
        if resume_file:
            try:
                logger.info("📤 Uploading resume...")
                file_buffer = resume_file.read()
                result = upload_pdf_to_cloudinary(file_buffer, f"resume_{user.id}_{resume_file.name}")
                user.resume_url = result["secure_url"]
                logger.info("📄 Resume URL saved: %s", user.resume_url)
                try:
                    resume_text = parse_resume(file_buffer)
                    if resume_text:
                        user.resume_data = extract_resume_info(resume_text)
                        logger.info("✅ Resume parsed successfully")
                except Exception as pe:
                    logger.info("⚠️ Resume parsing skipped (non-blocking): %s", pe)
            except Exception as ue:
                logger.error("❌ Resume upload error: %s", ue)
                return Response({"message": "Failed to upload resume", "error": str(ue)}, status=400)

        # Sync top-level fields into interviewProfile JSONB
        current_profile = user.interview_profile or {}
        user.interview_profile = {
            **current_profile,
            "domain":          user.domain or current_profile.get("domain"),
            "experienceLevel": user.experience or current_profile.get("experienceLevel"),
            "role":            user.role or current_profile.get("role"),
            "salaryRange":     user.desired_salary or current_profile.get("salaryRange"),
        }

        user.save()
        return Response({"success": True, "message": "Profile updated successfully", "data": UserSerializer(user).data})

    def delete(self, request):
        password = request.data.get("password", "")
        if not password:
            return Response({"message": "Password required to delete account"}, status=400)
        try:
            user = User.objects.get(pk=request.user.id)
        except User.DoesNotExist:
            return Response({"message": "User not found"}, status=404)
        if not check_password(password, user.password):
            return Response({"message": "Invalid password"}, status=401)
        user.totp_secret  = None
        user.totp_enabled = False
        user.save(update_fields=["totp_secret", "totp_enabled"])
        user.delete()
        return Response({"success": True, "message": "Account and all authentication methods deleted successfully"})


class Disable2FAView(APIView):
    """POST /api/user/profile/disable-2fa — port of disableTwoFactor()"""
    permission_classes = [IsAuthenticatedUser]

    def post(self, request):
        password = request.data.get("password", "")
        if not password:
            return Response({"message": "Password required"}, status=400)
        try:
            user = User.objects.get(pk=request.user.id)
        except User.DoesNotExist:
            return Response({"message": "User not found"}, status=404)
        if not check_password(password, user.password):
            return Response({"message": "Invalid password"}, status=401)
        user.totp_secret  = None
        user.totp_enabled = False
        user.save(update_fields=["totp_secret", "totp_enabled"])
        return Response({"success": True, "message": "2FA disabled successfully"})


# ── Resume endpoints ──────────────────────────────────────────────────────────

class ResumeUploadView(APIView):
    """POST /api/resume/upload — port of uploadResume()"""
    permission_classes = [IsAuthenticatedUser]

    def post(self, request):
        resume_url_param = request.data.get("resumeURL")
        resume_file      = request.FILES.get("file")

        if not resume_url_param and not resume_file:
            return Response({"message": "resumeURL or file is required"}, status=400)

        try:
            user = User.objects.get(pk=request.user.id)
        except User.DoesNotExist:
            return Response({"message": "User not found"}, status=404)

        new_resume_url = resume_url_param or user.resume_url
        resume_data    = {}

        if resume_file:
            if resume_file.content_type != "application/pdf":
                return Response({"message": "Only PDF files are allowed"}, status=400)
            if resume_file.size > 5 * 1024 * 1024:
                return Response({"message": "File size must be less than 5MB"}, status=400)

            file_buffer = resume_file.read()
            result = upload_pdf_to_cloudinary(file_buffer, f"{user.id}_{resume_file.name}")
            new_resume_url = result["secure_url"]
            try:
                text = parse_resume(file_buffer)
                resume_data = extract_resume_info(text)
            except Exception as pe:
                logger.error("Resume parsing error: %s", pe)

        user.resume_url  = new_resume_url
        if resume_data:
            user.resume_data = resume_data
        user.save(update_fields=["resume_url", "resume_data"])

        return Response({
            "message":       "Resume uploaded successfully",
            "resumeURL":     new_resume_url,
            "extractedInfo": resume_data,
        })


class ResumeView(APIView):
    """GET /api/resume — port of getResume()"""
    permission_classes = [IsAuthenticatedUser]

    def get(self, request):
        try:
            user = User.objects.get(pk=request.user.id)
        except User.DoesNotExist:
            return Response({"message": "User not found"}, status=404)
        if not user.resume_url:
            return Response({"message": "Resume not found"}, status=404)
        return Response({"resumeURL": user.resume_url, "resumeData": user.resume_data})


class ResumeParsePublicView(APIView):
    """POST /api/resume/parse — port of parseResumePublic() (no auth needed)"""

    def post(self, request):
        resume_file = request.FILES.get("file")
        if not resume_file:
            return Response({"message": "No PDF file provided"}, status=400)
        if resume_file.content_type != "application/pdf":
            return Response({"message": "Only PDF files are allowed"}, status=400)
        try:
            text = parse_resume_from_buffer(resume_file.read())
            data = extract_resume_info(text)
            return Response({"message": "Parsed", "data": data})
        except Exception as exc:
            logger.error("parseResumePublic error: %s", exc)
            return Response({"message": "Parse failed", "error": str(exc)}, status=500)
