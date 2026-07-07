from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count
from django.utils import timezone
from datetime import timedelta

from apps.payments.models import Transaction
from apps.subscriptions.models import Subscription


class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Scope everything to the logged-in user's tenant
        tenant = request.tenant

        # Last 30 days window
        thirty_days_ago = timezone.now() - timedelta(days=30)

        # Total revenue — sum of all successful transactions
        total_revenue = Transaction.objects.filter(
            tenant=tenant,
            status="SUCCESS",
        ).aggregate(total=Sum("amount"))["total"] or 0

        # Revenue in last 30 days
        recent_revenue = Transaction.objects.filter(
            tenant=tenant,
            status="SUCCESS",
            created_at__gte=thirty_days_ago,
        ).aggregate(total=Sum("amount"))["total"] or 0

        # Active subscriptions count
        active_subscriptions = Subscription.objects.filter(
            user__tenant=tenant,
            status="ACTIVE",
        ).count()

        # Failed payments in last 30 days
        failed_payments = Transaction.objects.filter(
            tenant=tenant,
            status="FAILED",
            created_at__gte=thirty_days_ago,
        ).count()

        # Daily revenue for the chart — last 30 days broken down by day
        daily_revenue = []
        for i in range(29, -1, -1):
            day = timezone.now().date() - timedelta(days=i)
            day_total = Transaction.objects.filter(
                tenant=tenant,
                status="SUCCESS",
                created_at__date=day,
            ).aggregate(total=Sum("amount"))["total"] or 0

            daily_revenue.append({
                "date": day.strftime("%b %d"),
                "revenue": float(day_total),
            })

        return Response({
            "total_revenue": float(total_revenue),
            "recent_revenue": float(recent_revenue),
            "active_subscriptions": active_subscriptions,
            "failed_payments": failed_payments,
            "daily_revenue": daily_revenue,
        })


class RecentTransactionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant = request.tenant
        status_filter = request.query_params.get("status")

        transactions = Transaction.objects.filter(
            tenant=tenant
        ).order_by("-created_at")[:50]

        if status_filter:
            transactions = transactions.filter(status=status_filter.upper())

        data = [
            {
                "id": str(t.id),
                "phone": t.phone,
                "amount": float(t.amount),
                "status": t.status,
                "mpesa_receipt": t.mpesa_receipt,
                "created_at": t.created_at.strftime("%Y-%m-%d %H:%M"),
            }
            for t in transactions
        ]

        return Response({"transactions": data})