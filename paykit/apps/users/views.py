from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import get_user_model
from apps.tenants.models import Tenant
from apps.subscriptions.models import Plan

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