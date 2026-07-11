from rest_framework.permissions import BasePermission


class IsSuperUser(BasePermission):
    """
    Only allows access to users with is_superuser=True.
    Every other user gets a 403 Forbidden.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.is_superuser
        )