"""Admin model — maps to 'admins' table (separate from Django's built-in admin)."""
from django.db import models
from django.conf import settings


class AdminRecord(models.Model):
    user        = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        db_column="userId",
        related_name="admin_record",
    )
    role_level  = models.CharField(max_length=100, default="support-admin", db_column="roleLevel")
    permissions = models.JSONField(default=list)
    created_by  = models.ForeignKey(
        "self",
        null=True, blank=True,
        on_delete=models.SET_NULL,
        db_column="createdBy",
        related_name="created_admins",
    )
    created_at  = models.DateTimeField(auto_now_add=True, db_column="createdAt")
    updated_at  = models.DateTimeField(auto_now=True, db_column="updatedAt")

    class Meta:
        db_table = "admins"

    def __str__(self):
        return f"Admin {self.user_id} ({self.role_level})"
