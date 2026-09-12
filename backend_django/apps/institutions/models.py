"""Institution model — maps to 'institutions' table."""
from django.db import models


class Institution(models.Model):
    name                  = models.CharField(max_length=255, unique=True)
    allowed_domains       = models.JSONField(default=list, db_column="allowedDomains")
    per_student_price     = models.FloatField(default=0, db_column="perStudentPrice")
    student_limit         = models.IntegerField(default=0, db_column="studentLimit")
    students_registered   = models.IntegerField(default=0, db_column="studentsRegistered")
    approval_status       = models.CharField(max_length=50, default="PENDING", db_column="approvalStatus")
    subscription_valid_till = models.DateTimeField(null=True, blank=True, db_column="subscriptionValidTill")
    created_at            = models.DateTimeField(auto_now_add=True, db_column="createdAt")
    updated_at            = models.DateTimeField(auto_now=True, db_column="updatedAt")

    class Meta:
        db_table = "institutions"

    def __str__(self):
        return self.name
