from django.http import JsonResponse
from .models import Tenant
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model


class TenantMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.tenant = None

        # Try session auth first (for Django admin)
        if request.user.is_authenticated:
            try:
                request.tenant = Tenant.objects.get(owner=request.user)
            except Tenant.DoesNotExist:
                pass

        # Try JWT auth (for API requests from React)
        if request.tenant is None:
            auth_header = request.headers.get("Authorization", "")
            if auth_header.startswith("Bearer "):
                try:
                    token_str = auth_header.split(" ")[1]
                    token = AccessToken(token_str)
                    user_id = token["user_id"]
                    User = get_user_model()
                    user = User.objects.get(id=user_id)
                    request.tenant = Tenant.objects.get(owner=user)
                except Exception:
                    pass

        response = self.get_response(request)
        return response