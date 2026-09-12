"""
Custom DRF exception handler — mirrors error.middleware.js.
Returns consistent JSON error responses.
"""
import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        # Normalise to {message: ...} shape matching Node.js responses
        data = response.data
        if isinstance(data, dict) and "message" not in data:
            # Try to extract a meaningful message
            detail = data.get("detail") or data.get("non_field_errors") or data
            if isinstance(detail, list) and len(detail) > 0:
                detail = str(detail[0])
            response.data = {"message": str(detail)}
        return response

    # Unhandled exception
    logger.exception("Unhandled exception", exc_info=exc)
    return Response(
        {"message": "Internal server error", "error": str(exc)},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
