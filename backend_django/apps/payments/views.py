"""
payments/views.py
Port of payment.controller.js.
Handles: Razorpay order creation and webhook verification.
"""
import hashlib
import hmac
import json
import logging

from django.conf import settings
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Subscription
from interviewai.permissions import IsAuthenticatedUser

logger = logging.getLogger(__name__)


def _get_razorpay():
    try:
        import razorpay
        return razorpay.Client(
            auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
        )
    except ImportError:
        return None


class CreateOrderView(APIView):
    """POST /api/payments/create-order — port of createOrder()"""
    permission_classes = [IsAuthenticatedUser]

    def post(self, request):
        amount   = request.data.get("amount")
        currency = request.data.get("currency", "INR")
        receipt  = request.data.get("receipt") or f"rcpt_{__import__('time').time_ns()}"

        if not amount:
            return Response({"message": "amount is required"}, status=400)

        client = _get_razorpay()
        if not client:
            return Response({"message": "Razorpay SDK not installed. Run: pip install razorpay"}, status=503)

        try:
            order = client.order.create({
                "amount":   round(float(amount) * 100),
                "currency": currency,
                "receipt":  receipt,
            })
            return Response({"order": order})
        except Exception as exc:
            logger.error("Razorpay order creation failed: %s", exc)
            return Response({"message": str(exc)}, status=500)


class WebhookView(APIView):
    """POST /api/payments/webhook — port of verifyWebhook()"""

    def post(self, request):
        secret = getattr(settings, "RAZORPAY_WEBHOOK_SECRET", "") or ""
        sig    = request.headers.get("X-Razorpay-Signature", "")

        body = request.body
        digest = hmac.new(
            secret.encode(),
            body,
            hashlib.sha256,
        ).hexdigest()

        if sig != digest:
            return Response({"message": "Invalid signature"}, status=400)

        try:
            data = json.loads(body)
        except Exception:
            return Response({"ok": True})

        if data.get("event") == "payment.captured":
            p = (data.get("payload") or {}).get("payment", {}).get("entity", {})
            try:
                Subscription.objects.create(
                    user          = None,
                    institution   = None,
                    plan          = p.get("description") or "one-time",
                    provider_id   = p.get("id"),
                    status        = "ACTIVE",
                    valid_till    = None,
                )
            except Exception as exc:
                logger.error("Subscription creation failed: %s", exc)

        return Response({"ok": True})
