from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import get_user_model
from apps.tenants.models import Tenant
from apps.subscriptions.models import Plan
from allauth.socialaccount.models import SocialAccount
from rest_framework_simplejwt.tokens import RefreshToken
import requests as http_requests

User = get_user_model()


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

        # Verify token with Google and get user info
        google_response = http_requests.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {google_token}"}
        )

        if google_response.status_code != 200:
            return Response(
                {"error": "Invalid Google token"},
                status=status.HTTP_400_BAD_REQUEST
            )

        google_data = google_response.json()
        email       = google_data.get("email")
        name        = google_data.get("name", "")
        google_id   = google_data.get("sub")  # Google's unique user ID

        if not email:
            return Response(
                {"error": "Could not retrieve email from Google"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Find or create the user
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "username": email.split("@")[0],
                "first_name": name.split(" ")[0] if name else "",
                "last_name":  " ".join(name.split(" ")[1:]) if name else "",
            }
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