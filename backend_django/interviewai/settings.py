"""
Django settings for InterviewAI backend.
"""
import os
from pathlib import Path
from datetime import timedelta
from decouple import config, Csv

BASE_DIR = Path(__file__).resolve().parent.parent

# ── Core ──────────────────────────────────────────────────────────
SECRET_KEY = config("DJANGO_SECRET_KEY", default="django-insecure-change-me-in-production")
DEBUG = config("DEBUG", default=True, cast=bool)
ALLOWED_HOSTS = config("ALLOWED_HOSTS", default="*", cast=Csv())

# ── Applications ──────────────────────────────────────────────────
INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.auth",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    # Local apps
    "apps.users",
    "apps.institutions",
    "apps.sessions",
    "apps.payments",
    "apps.admin_panel",
    "apps.auth_app",
    "apps.guest",
]

# ── Middleware ─────────────────────────────────────────────────────
MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.common.CommonMiddleware",
    "interviewai.middleware.RequestLoggerMiddleware",
]

ROOT_URLCONF = "interviewai.urls"

WSGI_APPLICATION = "interviewai.wsgi.application"

# ── Database ──────────────────────────────────────────────────────
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME":     config("DB_NAME", default="interviewai"),
        "USER":     config("DB_USER", default="postgres"),
        "PASSWORD": config("DB_PASS", default=""),
        "HOST":     config("DB_HOST", default="127.0.0.1"),
        "PORT":     config("DB_PORT", default="5432"),
        "CONN_MAX_AGE": 60,
    }
}

# ── Auth ──────────────────────────────────────────────────────────
AUTH_USER_MODEL = "users.User"

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 8}},
]

# ── DRF ───────────────────────────────────────────────────────────
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "interviewai.authentication.CookieJWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.AllowAny",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "EXCEPTION_HANDLER": "interviewai.exceptions.custom_exception_handler",
}

# ── JWT ───────────────────────────────────────────────────────────
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME":  timedelta(minutes=config("JWT_ACCESS_TOKEN_LIFETIME", default=480, cast=int)),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),
    "ROTATE_REFRESH_TOKENS":  False,
    "ALGORITHM":              "HS256",
    "SIGNING_KEY":            config("JWT_SECRET", default=SECRET_KEY),
    "AUTH_HEADER_TYPES":      ("Bearer",),
    "AUTH_COOKIE":            "token",
    "AUTH_COOKIE_HTTP_ONLY":  True,
    "AUTH_COOKIE_SECURE":     not DEBUG,
    "AUTH_COOKIE_SAMESITE":   "Lax",
}

# ── CORS ──────────────────────────────────────────────────────────
CLIENT_URL = config("CLIENT_URL", default="http://localhost:5173")
CORS_ALLOWED_ORIGINS = [
    CLIENT_URL,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = DEBUG  # In dev allow all; in prod only CLIENT_URL

# ── AI Provider & Models ──────────────────────────────────────────
AI_PROVIDER    = config("AI_PROVIDER", default="gemini")
GEMINI_API_KEY = config("GEMINI_API_KEY", default="")
GEMINI_MODEL   = config("GEMINI_MODEL", default="gemini-3.6-flash")
OLLAMA_HOST    = config("OLLAMA_HOST",  default="http://localhost:11434")
OLLAMA_MODEL   = config("OLLAMA_MODEL", default="qwen2.5-coder:14b")

# ── Email ─────────────────────────────────────────────────────────
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = "smtp.gmail.com"
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = config("EMAIL_USER", default="")
EMAIL_HOST_PASSWORD = config("EMAIL_PASS", default="")
DEFAULT_FROM_EMAIL = f"InterviewAI <{EMAIL_HOST_USER}>"

# ── Cloudinary ────────────────────────────────────────────────────
CLOUDINARY_CLOUD_NAME  = config("CLOUDINARY_CLOUD_NAME", default="")
CLOUDINARY_API_KEY     = config("CLOUDINARY_API_KEY", default="")
CLOUDINARY_API_SECRET  = config("CLOUDINARY_API_SECRET", default="")

# ── Razorpay ──────────────────────────────────────────────────────
RAZORPAY_KEY_ID        = config("RAZORPAY_KEY_ID", default="")
RAZORPAY_KEY_SECRET    = config("RAZORPAY_KEY_SECRET", default="")
RAZORPAY_WEBHOOK_SECRET = config("RAZORPAY_WEBHOOK_SECRET", default="")



# ── Internationalization ──────────────────────────────────────────
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# ── Static ────────────────────────────────────────────────────────
STATIC_URL = "/static/"

# ── File uploads ──────────────────────────────────────────────────
FILE_UPLOAD_HANDLERS = ["django.core.files.uploadhandler.MemoryFileUploadHandler"]
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10 MB

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ── Logging ───────────────────────────────────────────────────────
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "[{asctime}] {levelname} {name}: {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
}
