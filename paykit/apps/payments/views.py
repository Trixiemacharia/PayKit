from apps.subscriptions.models import Subscription
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from config.daraja import DarajaClient
from .models import Transaction
from .serializers import STKPushSerializer
from django_ratelimit.decorators import ratelimit
from django.utils.decorators import method_decorator

@method_decorator(ratelimit(key="ip", rate="20/m", block=True), name="post")
class STKPushView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = STKPushSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        phone = serializer.validated_data["phone"]
        amount = serializer.validated_data["amount"]

        # ── Plan enforcement ──────────────────────────────────────────
        tenant = request.tenant
        if tenant:
            sub = Subscription.objects.filter(
                user__tenant=tenant, status="ACTIVE"
            ).select_related("plan").first()

            if sub:
                plan_name = sub.plan.name
                limits = {"Starter": 100, "Pro": 1000, "Enterprise": None}
                limit = limits.get(plan_name)

                if limit is not None:
                    from django.utils import timezone
                    this_month_count = Transaction.objects.filter(
                        tenant=tenant,
                        created_at__month=timezone.now().month,
                        created_at__year=timezone.now().year,
                    ).count()

                    if this_month_count >= limit:
                        return Response({
                            "error": f"Monthly transaction limit of {limit} reached on your {plan_name} plan.",
                            "upgrade_required": True,
                        }, status=status.HTTP_403_FORBIDDEN)

        try:
            daraja = DarajaClient()
            response = daraja.stk_push(
                phone=phone,
                amount=amount,
                account_reference="PayKit",
                transaction_desc="Subscription payment",
            )
        except Exception as e:
            return Response(
                {"error": "Failed to initiate payment. Try again.", "detail": str(e)},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        checkout_request_id = response.get("CheckoutRequestID")

        transaction = Transaction.objects.create(
            # Dashboard reporting is tenant-scoped.  Persist the tenant at
            # initiation time so the callback result is visible to the
            # business that sent the STK prompt.
            tenant=tenant,
            user=request.user,
            phone=phone,
            amount=amount,
            status="PENDING",
            checkout_request_id=checkout_request_id,
        )

        return Response({
            "message": "Payment initiated. Check your phone.",
            "checkout_request_id": checkout_request_id,
            "transaction_id": str(transaction.id),
        }, status=status.HTTP_201_CREATED)


class PaymentStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, checkout_request_id):
        try:
            transaction = Transaction.objects.get(
                checkout_request_id=checkout_request_id,
                user=request.user,
                tenant=request.tenant,
            )
        except Transaction.DoesNotExist:
            return Response({"error": "Transaction not found"}, status=status.HTTP_404_NOT_FOUND)

        return Response({
            "status": transaction.status,
            "mpesa_receipt": transaction.mpesa_receipt,
            "amount": transaction.amount,
            "phone": transaction.phone,
        })
