"""
totp_service.py
Python port of totp.service.js.
Generates and verifies TOTP secrets using pyotp + qrcode.
"""
import logging
import pyotp
import qrcode
import qrcode.image.svg
from io import BytesIO
import base64

logger = logging.getLogger(__name__)

APP_NAME = "InterviewAI"


def generate_totp_secret(user_email: str) -> dict:
    """
    Generate a new TOTP secret for a user.
    Returns secret (store in DB) and a QR code data URL for the frontend.
    Equivalent to generateTotpSecret() in totp.service.js.
    """
    secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret)
    otpauth_url = totp.provisioning_uri(name=user_email, issuer_name=APP_NAME)

    # Generate QR code as base64 PNG data URL
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(otpauth_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    qr_code_data_url = "data:image/png;base64," + base64.b64encode(buffer.getvalue()).decode()

    return {
        "secret": secret,
        "qrCode": qr_code_data_url,
        "otpauthUrl": otpauth_url,
    }


def verify_totp_token(secret: str, token: str) -> bool:
    """
    Verify a 6-digit TOTP token against the stored secret.
    window=1 allows 30s clock drift on either side.
    Equivalent to verifyTotpToken() in totp.service.js.
    """
    try:
        totp = pyotp.TOTP(secret)
        return totp.verify(str(token), valid_window=1)
    except Exception as exc:
        logger.error("TOTP verification error: %s", exc)
        return False
