"""
Custom JWT authentication that reads from HttpOnly cookie OR Authorization header.
Mirrors the Node.js auth.middleware.js behaviour exactly.
"""
import logging
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework.exceptions import AuthenticationFailed
from django.conf import settings

logger = logging.getLogger(__name__)


class CookieJWTAuthentication(JWTAuthentication):
    """
    Reads JWT from:
    1. HttpOnly cookie named 'token'
    2. Authorization: Bearer <token> header
    Returns (user_payload_obj, token) where user_payload_obj carries
    id, account_type attributes — matching req.user in Node.js.
    """

    def authenticate(self, request):
        raw_token = None

        # 1. Try cookie first
        raw_token = request.COOKIES.get(settings.SIMPLE_JWT.get("AUTH_COOKIE", "token"))

        # 2. Fall back to Authorization header
        if not raw_token:
            header = self.get_header(request)
            if header:
                raw_token = self.get_raw_token(header)

        if raw_token is None:
            return None  # No token — let views decide if auth is required

        try:
            validated_token = self.get_validated_token(raw_token)
        except TokenError as e:
            raise InvalidToken({"message": "Invalid token", "detail": str(e)})

        return self.get_user(validated_token), validated_token

    def get_user(self, validated_token):
        """Return a lightweight proxy object instead of hitting the DB for every request."""
        payload = validated_token.payload
        account_type = payload.get("account_type", "professional")
        user_id = payload.get("user_id") or payload.get("id")

        # Guest tokens have no real user id
        if account_type != "guest" and not user_id:
            raise AuthenticationFailed({"message": "Invalid token payload"})

        return JWTUserProxy(id=user_id, account_type=account_type)


class JWTUserProxy:
    """Lightweight stand-in for request.user — avoids a DB query on every request."""
    is_authenticated = True

    def __init__(self, id, account_type):
        self.id = id
        self.account_type = account_type
        self.pk = id  # DRF compat

    def __repr__(self):
        return f"<JWTUserProxy id={self.id} type={self.account_type}>"
