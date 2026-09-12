"""User serializers."""
from rest_framework import serializers
from .models import User


class UserSerializer(serializers.ModelSerializer):
    firstName  = serializers.CharField(source="first_name")
    lastName   = serializers.CharField(source="last_name")
    accountType = serializers.CharField(source="account_type")
    resumeURL  = serializers.CharField(source="resume_url")
    resumeData = serializers.JSONField(source="resume_data")
    totpEnabled = serializers.BooleanField(source="totp_enabled")
    interviewProfile = serializers.JSONField(source="interview_profile")
    usedGuestInterview = serializers.BooleanField(source="used_guest_interview")
    desiredSalary = serializers.CharField(source="desired_salary")

    class Meta:
        model  = User
        fields = [
            "id", "firstName", "lastName", "email", "accountType",
            "phone", "domain", "role", "experience", "skills", "education",
            "bio", "desiredSalary", "resumeURL", "resumeData",
            "interviewProfile", "totpEnabled", "usedGuestInterview",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
