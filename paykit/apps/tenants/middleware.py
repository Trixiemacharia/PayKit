from django.http import JsonResponse
from .models import Tenant


class TenantMiddleware:
    """
    Runs on every request.
    Looks up the tenant from the logged-in user and attaches it to the request.
    So anywhere in your views you can do: request.tenant
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.tenant = None  # default — no tenant identified yet

        if request.user.is_authenticated:
            try:
                request.tenant = Tenant.objects.get(owner=request.user)
            except Tenant.DoesNotExist:
                pass  # user exists but hasn't set up a tenant yet — that's fine

        response = self.get_response(request)
        return response