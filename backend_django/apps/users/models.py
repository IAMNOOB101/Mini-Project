"""
User model — custom AbstractBaseUser preserving all fields from db/index.js.
Table name: 'users' (matches Sequelize schema for zero-migration database reuse).
"""
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("account_type", "admin")
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser):
    """
    Maps directly to the 'users' table created by Sequelize.
    All camelCase JS fields are stored as snake_case column names in Postgres.
    """
    first_name               = models.CharField(max_length=255, db_column="firstName")
    last_name                = models.CharField(max_length=255, blank=True, default="", db_column="lastName")
    email                    = models.EmailField(unique=True)
    password                 = models.CharField(max_length=255, blank=True, null=True)
    account_type             = models.CharField(max_length=50, default="professional", db_column="accountType")
    enrollment_number        = models.CharField(max_length=255, blank=True, null=True, db_column="enrollmentNumber")
    institution_email_verified = models.BooleanField(default=False, db_column="institutionEmailVerified")
    institution              = models.ForeignKey(
        "institutions.Institution",
        null=True, blank=True,
        on_delete=models.SET_NULL,
        db_column="institutionId",
        related_name="students",
    )
    interview_profile        = models.JSONField(default=dict, db_column="interviewProfile")
    resume_url               = models.TextField(blank=True, null=True, db_column="resumeURL")
    resume_data              = models.JSONField(default=dict, db_column="resumeData")
    used_guest_interview     = models.BooleanField(default=False, db_column="usedGuestInterview")
    totp_secret              = models.CharField(max_length=255, blank=True, null=True, db_column="totpSecret")
    totp_enabled             = models.BooleanField(default=False, db_column="totpEnabled")
    domain                   = models.CharField(max_length=255, blank=True, null=True)
    role                     = models.CharField(max_length=255, blank=True, null=True)
    experience               = models.CharField(max_length=255, blank=True, null=True)
    desired_salary           = models.CharField(max_length=255, blank=True, null=True, db_column="desiredSalary")
    phone                    = models.CharField(max_length=50, blank=True, null=True)
    bio                      = models.TextField(blank=True, null=True)
    skills                   = models.TextField(blank=True, null=True)
    education                = models.TextField(blank=True, null=True)
    created_at               = models.DateTimeField(auto_now_add=True, db_column="createdAt")
    updated_at               = models.DateTimeField(auto_now=True, db_column="updatedAt")

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name"]

    objects = UserManager()

    class Meta:
        db_table = "users"

    def __str__(self):
        return self.email

    @property
    def is_active(self):
        return True

    @property
    def is_staff(self):
        return self.account_type in ("admin", "institution_admin")

    def has_perm(self, perm, obj=None):
        return self.account_type == "admin"

    def has_module_perms(self, app_label):
        return self.account_type == "admin"
