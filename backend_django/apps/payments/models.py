"""Subscription model — maps to 'subscriptions' table."""
from django.db import models
from django.conf import settings


class Subscription(models.Model):
    user          = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        db_column="userId",
        related_name="subscriptions",
    )
    institution   = models.ForeignKey(
        "institutions.Institution",
        null=True, blank=True,
        on_delete=models.SET_NULL,
        db_column="institutionId",
        related_name="subscriptions",
    )
    plan          = models.CharField(max_length=255, blank=True, null=True)
    provider_id   = models.CharField(max_length=255, blank=True, null=True, db_column="providerId")
    status        = models.CharField(max_length=50, default="ACTIVE")
    valid_till    = models.DateTimeField(null=True, blank=True, db_column="validTill")
    created_at    = models.DateTimeField(auto_now_add=True, db_column="createdAt")
    updated_at    = models.DateTimeField(auto_now=True, db_column="updatedAt")

    class Meta:
        db_table = "subscriptions"

    def __str__(self):
        return f"Subscription {self.id} (plan={self.plan}, status={self.status})"
