"""
DRF permission classes mapping to Node.js role middleware.
Mirrors: requireAccountType, permit, allowRoles.
"""
from rest_framework.permissions import BasePermission


class IsAuthenticatedUser(BasePermission):
    """Request must have a valid JWT (any account type including guest)."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)


class RequireAccountType(BasePermission):
    """
    Base class; subclass and set `allowed_types`.
    Mirrors requireAccountType(...allowedTypes) in Node.js.
    """
    allowed_types = []

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.account_type in self.allowed_types


class IsAdmin(RequireAccountType):
    allowed_types = ["admin", "institution_admin"]


class IsNonGuest(BasePermission):
    """Deny guests — registered users only."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.account_type != "guest"


def require_account_types(*types):
    """Factory function returning a permission class for the given account types."""
    class _Permission(BasePermission):
        def has_permission(self, request, view):
            if not request.user or not request.user.is_authenticated:
                return False
            return request.user.account_type in types
    _Permission.__name__ = f"Permit({'|'.join(types)})"
    return _Permission
