"""
Request logger middleware — mirrors logger.middleware.js.
Logs: method, path, status, response time.
"""
import time
import logging

logger = logging.getLogger("interviewai.requests")


class RequestLoggerMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start = time.monotonic()
        response = self.get_response(request)
        elapsed_ms = round((time.monotonic() - start) * 1000)
        logger.info(
            "%s %s %s %dms",
            request.method,
            request.path,
            response.status_code,
            elapsed_ms,
        )
        return response
