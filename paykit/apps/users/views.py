from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from apps.tenants.models import Tenant
from apps.subscriptions.models import Plan
from allauth.socialaccount.models import SocialAccount
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
import requests as http_requests
from django_ratelimit.decorators import ratelimit
from django.utils.decorators import method_decorator
from django.http import JsonResponse
from django.conf import settings

User = get_user_model()

def rate_limit_error(request, exception=None):
    return JsonResponse(
        {"error": "Too many requests. Please wait a minute and try again."},
        status=429
    )

def google_username(email):
    """Return an available username for projects using Django's default user."""
    username_field = User._meta.get_field(User.USERNAME_FIELD)
    max_length = username_field.max_length
    base = email.split("@", 1)[0][:max_length] or "google-user"
    candidate = base
    suffix = 1
    while User.objects.filter(**{User.USERNAME_FIELD: candidate}).exists():
        suffix_text = f"-{suffix}"
        candidate = f"{base[:max_length - len(suffix_text)]}{suffix_text}"
        suffix += 1
    return candidate

@method_decorator(ratelimit(key="ip", rate="5/m", block=True), name="post")
class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get("username")
        email = request.data.get("email")
        password = request.data.get("password")

        if not all([username, email, password]):
            return Response(
                {"error": "username, email and password are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if User.objects.filter(email=email).exists():
            return Response(
                {"error": "A user with this email already exists"},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
        )

        return Response({
            "message": "Account created successfully",
            "user_id": str(user.id),
        }, status=status.HTTP_201_CREATED)


class CreateTenantView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        name = request.data.get("name")
        slug = request.data.get("slug")

        if not all([name, slug]):
            return Response(
                {"error": "name and slug are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if Tenant.objects.filter(slug=slug).exists():
            return Response(
                {"error": "This business slug is already taken"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if hasattr(request.user, "tenant"):
            return Response(
                {"error": "You already have a tenant"},
                status=status.HTTP_400_BAD_REQUEST
            )

        tenant = Tenant.objects.create(
            name=name,
            slug=slug,
            owner=request.user,
            is_active=False,  # not active until first payment
        )

        return Response({
            "message": "Tenant created",
            "tenant_id": str(tenant.id),
            "slug": tenant.slug,
        }, status=status.HTTP_201_CREATED)


class ListPlansView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        plans = Plan.objects.filter(is_active=True)
        data = [
            {
                "id": str(p.id),
                "name": p.name,
                "price_kes": float(p.price_kes),
                "billing_cycle": p.billing_cycle,
                "features": p.features,
            }
            for p in plans
        ]
        return Response({"plans": data})

@method_decorator(ratelimit(key="ip", rate="10/m", block=True), name="post")
class GoogleLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        """
        Receives the Google access token from React (after Google OAuth popup),
        verifies it with Google, finds or creates the user,
        and returns a JWT token pair.
        """
        google_token = request.data.get("access_token")
        if not google_token:
            return Response(
                {"error": "access_token is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verify the token with Google and make sure it was issued for this
        # application's OAuth client.  Calling userinfo alone only proves that
        # a token is valid; it does not prove that it belongs to PayKit.
        try:
            token_info_response = http_requests.get(
                "https://oauth2.googleapis.com/tokeninfo",
                params={"access_token": google_token},
                timeout=10,
            )
            if token_info_response.status_code != 200:
                return Response(
                    {"error": "Your Google session has expired. Please select your account again."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            token_info = token_info_response.json()
            token_audience = token_info.get("aud") or token_info.get("issued_to")
            if token_audience != settings.GOOGLE_CLIENT_ID:
                return Response(
                    {"error": "This Google sign-in token was issued for a different application."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            google_response = http_requests.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {google_token}"},
                timeout=10,
            )
        except http_requests.RequestException:
            return Response(
                {"error": "Google could not be reached. Please try again."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        if google_response.status_code != 200:
            return Response(
                {"error": "Your Google session has expired. Please select your account again."},
                status=status.HTTP_400_BAD_REQUEST
            )

        google_data = google_response.json()
        email       = google_data.get("email")
        name        = google_data.get("name", "")
        google_id   = google_data.get("sub")  # Google's unique user ID

        if not email or not google_id:
            return Response(
                {"error": "Could not retrieve a Google account identity"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not google_data.get("email_verified"):
            return Response(
                {"error": "Your Google email address must be verified"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # A provider UID is the stable identity. Email is used only to link an
        # existing local account the first time that Google account signs in.
        with transaction.atomic():
            social_account = (
                SocialAccount.objects.select_related("user")
                .filter(provider="google", uid=google_id)
                .first()
            )
            if social_account:
                user = social_account.user
                created = False
                social_account.extra_data = google_data
                social_account.save(update_fields=["extra_data"])
            else:
                user = User.objects.filter(email__iexact=email).first()
                created = user is None
                if created:
                    try:
                        user = User.objects.create_user(
                            username=google_username(email),
                            email=email,
                            first_name=name.split(" ")[0] if name else "",
                            last_name=" ".join(name.split(" ")[1:]) if name else "",
                        )
                    except IntegrityError:
                        # A concurrent first login may have created the user.
                        user = User.objects.get(email__iexact=email)
                        created = False
                SocialAccount.objects.create(
                    user=user,
                    provider="google",
                    uid=google_id,
                    extra_data=google_data,
                )

        # Generate JWT tokens for this user
        refresh = RefreshToken.for_user(user)
        access  = refresh.access_token

        return Response({
            "access":       str(access),
            "refresh":      str(refresh),
            "is_superuser": user.is_superuser,
            "username":     user.username,
            "email":        user.email,
            "is_new_user":  created,  # React uses this to redirect to onboarding
        })

@method_decorator(ratelimit(key="ip", rate="3/m", block=True), name="post")
class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get("refresh_token")
        if not refresh_token:
            return Response(
                {"error": "refresh_token is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({"message": "Logged out successfully"})
        except TokenError:
            return Response(
                {"error": "Invalid or already blacklisted token"},
                status=status.HTTP_400_BAD_REQUEST
            )

def axes_whitelist(request):
    """
    Whitelist endpoints that should never be blocked by axes.
    Returns True to whitelist (skip axes check), False to apply axes.
    """
    whitelisted_paths = [
        "/api/users/google/",
        "/api/users/register/",
        "/api/users/plans/",
    ]
    return request.path in whitelisted_paths