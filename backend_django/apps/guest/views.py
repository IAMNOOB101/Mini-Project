"""
guest/views.py
Port of guest.controller.js.
Starts a guest interview session (no auth required).
"""
import logging
import uuid

from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger(__name__)

_USED_GUEST_EMAILS: set[str] = set()  # In-memory set (mirrors the JS hasCompletedFreeInterview check)


class GuestStartView(APIView):
    """POST /api/guest/start — port of startGuestInterview()"""

    def post(self, request):
        data = request.data
        first_name      = (data.get("firstName") or "").strip()
        last_name       = (data.get("lastName") or "").strip()
        email           = (data.get("email") or "").strip().lower()
        domain          = data.get("domain", "")
        role            = data.get("role", "")
        experience_level = data.get("experienceLevel")
        salary_range    = data.get("salaryRange")

        if not first_name or not email or not domain or not role:
            return Response({"message": "Missing required fields: firstName, email, domain, role"}, status=400)

        if email in _USED_GUEST_EMAILS:
            return Response({
                "success": False,
                "message": "You've already used your free interview. Please purchase a plan to continue.",
                "needsUpgrade": True,
            }, status=403)

        session_id = str(uuid.uuid4())
        return Response({
            "success": True,
            "data": {
                "sessionId": session_id,
                "guestName": f"{first_name} {last_name}".strip(),
                "guestEmail": email,
                "isGuest": True,
                "isFreeInterview": True,
                "profile": {
                    "firstName":       first_name,
                    "lastName":        last_name,
                    "email":           email,
                    "domain":          domain,
                    "role":            role,
                    "experienceLevel": experience_level,
                    "salaryRange":     salary_range,
                    "resumeUrl":       None,
                    "resumeData":      None,
                },
            },
        })
