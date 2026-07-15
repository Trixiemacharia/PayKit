from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count
from django.db.models.functions import TruncMonth
from django.utils import timezone
from django.contrib.auth import get_user_model
from datetime import timedelta
from dateutil.relativedelta import relativedelta

from apps.payments.models import Transaction
from apps.subscriptions.models import Subscription, Plan
from apps.tenants.models import Tenant
from .permissions import IsSuperUser

User = get_user_model()


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

class AdminOverviewView(APIView):
    permission_classes = [IsSuperUser]

    def get(self, request):
        now = timezone.now()
        this_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        last_month_start = this_month_start - relativedelta(months=1)

        # Total businesses (tenants)
        total_businesses = Tenant.objects.count()
        new_signups_this_month = Tenant.objects.filter(
            created_at__gte=this_month_start
        ).count()

        # Revenue
        total_revenue = Transaction.objects.filter(
            status="SUCCESS"
        ).aggregate(total=Sum("amount"))["total"] or 0

        mrr = Transaction.objects.filter(
            status="SUCCESS",
            created_at__gte=this_month_start,
        ).aggregate(total=Sum("amount"))["total"] or 0

        arr = float(mrr) * 12

        last_month_revenue = Transaction.objects.filter(
            status="SUCCESS",
            created_at__gte=last_month_start,
            created_at__lt=this_month_start,
        ).aggregate(total=Sum("amount"))["total"] or 0

        # Payments
        successful_payments = Transaction.objects.filter(
            status="SUCCESS"
        ).count()

        failed_payments = Transaction.objects.filter(
            status="FAILED"
        ).count()

        # Active subscriptions across all tenants
        active_subscriptions = Subscription.objects.filter(
            status="ACTIVE"
        ).count()

        return Response({
            "total_businesses": total_businesses,
            "new_signups_this_month": new_signups_this_month,
            "total_revenue": float(total_revenue),
            "mrr": float(mrr),
            "arr": float(arr),
            "last_month_revenue": float(last_month_revenue),
            "successful_payments": successful_payments,
            "failed_payments": failed_payments,
            "active_subscriptions": active_subscriptions,
        })


class AdminBusinessesView(APIView):
    permission_classes = [IsSuperUser]

    def get(self, request):
        tenants = Tenant.objects.select_related("owner", "plan").all().order_by("-created_at")

        data = []
        for tenant in tenants:
            # Count active subscriptions for this tenant
            active_subs = Subscription.objects.filter(
                user__tenant=tenant,
                status="ACTIVE"
            ).count()

            # Total revenue from this tenant
            tenant_revenue = Transaction.objects.filter(
                tenant=tenant,
                status="SUCCESS"
            ).aggregate(total=Sum("amount"))["total"] or 0

            data.append({
                "id": str(tenant.id),
                "name": tenant.name,
                "slug": tenant.slug,
                "owner_email": tenant.owner.email,
                "plan": tenant.plan.name if tenant.plan else "No plan",
                "plan_price": float(tenant.plan.price_kes) if tenant.plan else 0,
                "is_active": tenant.is_active,
                "active_subscriptions": active_subs,
                "total_revenue": float(tenant_revenue),
                "created_at": tenant.created_at.strftime("%Y-%m-%d"),
            })

        return Response({"businesses": data})


class AdminBusinessActionView(APIView):
    permission_classes = [IsSuperUser]

    def patch(self, request, tenant_id):
        action = request.data.get("action")

        try:
            tenant = Tenant.objects.get(id=tenant_id)
        except Tenant.DoesNotExist:
            return Response({"error": "Tenant not found"}, status=status.HTTP_404_NOT_FOUND)

        if action == "disable":
            tenant.is_active = False
            tenant.save()
            return Response({"message": f"{tenant.name} has been disabled"})

        elif action == "enable":
            tenant.is_active = True
            tenant.save()
            return Response({"message": f"{tenant.name} has been enabled"})

        elif action == "delete":
            name = tenant.name
            tenant.delete()
            return Response({"message": f"{name} has been deleted"})

        elif action == "upgrade":
            plan_id = request.data.get("plan_id")
            try:
                plan = Plan.objects.get(id=plan_id)
                tenant.plan = plan
                tenant.save()
                return Response({"message": f"{tenant.name} upgraded to {plan.name}"})
            except Plan.DoesNotExist:
                return Response({"error": "Plan not found"}, status=status.HTTP_404_NOT_FOUND)

        return Response({"error": "Invalid action"}, status=status.HTTP_400_BAD_REQUEST)


class AdminRevenueView(APIView):
    permission_classes = [IsSuperUser]

    def get(self, request):
        now = timezone.now()
        this_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # Platform earnings (total all time)
        platform_earnings = Transaction.objects.filter(
            status="SUCCESS"
        ).aggregate(total=Sum("amount"))["total"] or 0

        # MRR
        mrr = Transaction.objects.filter(
            status="SUCCESS",
            created_at__gte=this_month_start,
        ).aggregate(total=Sum("amount"))["total"] or 0

        # Revenue by plan
        subscription_revenue = []
        for plan in Plan.objects.filter(is_active=True):
            plan_revenue = Transaction.objects.filter(
                status="SUCCESS",
                subscription__plan=plan,
            ).aggregate(total=Sum("amount"))["total"] or 0
            subscription_revenue.append({
                "plan": plan.name,
                "revenue": float(plan_revenue),
                "price_kes": float(plan.price_kes),
            })

        # Monthly revenue trend (last 6 months)
        monthly_trend = []
        for i in range(5, -1, -1):
            month_start = (now - relativedelta(months=i)).replace(
                day=1, hour=0, minute=0, second=0, microsecond=0
            )
            month_end = month_start + relativedelta(months=1)
            month_total = Transaction.objects.filter(
                status="SUCCESS",
                created_at__gte=month_start,
                created_at__lt=month_end,
            ).aggregate(total=Sum("amount"))["total"] or 0
            monthly_trend.append({
                "month": month_start.strftime("%b %Y"),
                "revenue": float(month_total),
            })

        return Response({
            "platform_earnings": float(platform_earnings),
            "mrr": float(mrr),
            "arr": float(mrr) * 12,
            "total_commissions": float(platform_earnings) * 0.05,  # 5% commission example
            "subscription_revenue": subscription_revenue,
            "monthly_trend": monthly_trend,
        })


class AdminTransactionsView(APIView):
    permission_classes = [IsSuperUser]

    def get(self, request):
        transactions = Transaction.objects.select_related(
            "tenant", "user"
        ).order_by("-created_at")

        # Filters from query params
        business = request.query_params.get("business")
        status_filter = request.query_params.get("status")
        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")
        plan_filter = request.query_params.get("plan")

        if business:
            transactions = transactions.filter(tenant__slug=business)
        if status_filter:
            transactions = transactions.filter(status=status_filter.upper())
        if date_from:
            transactions = transactions.filter(created_at__date__gte=date_from)
        if date_to:
            transactions = transactions.filter(created_at__date__lte=date_to)

        data = [
            {
                "id": str(t.id),
                "business": t.tenant.name if t.tenant else "—",
                "phone": t.phone,
                "amount": float(t.amount),
                "status": t.status,
                "mpesa_receipt": t.mpesa_receipt or "—",
                "created_at": t.created_at.strftime("%Y-%m-%d %H:%M"),
            }
            for t in transactions[:100]
        ]

        return Response({"transactions": data})


class AdminUsersView(APIView):
    permission_classes = [IsSuperUser]

    def get(self, request):
        users = User.objects.filter(
            is_superuser=False
        ).select_related("tenant").order_by("-date_joined")

        data = [
            {
                "id": str(u.id),
                "username": u.username,
                "email": u.email,
                "business": u.tenant.name if hasattr(u, "tenant") else "No business",
                "is_active": u.is_active,
                "date_joined": u.date_joined.strftime("%Y-%m-%d"),
            }
            for u in users
        ]

        return Response({"users": data})


class AdminUserActionView(APIView):
    permission_classes = [IsSuperUser]

    def patch(self, request, user_id):
        action = request.data.get("action")

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

        if action == "deactivate":
            user.is_active = False
            user.save()
            return Response({"message": f"{user.email} deactivated"})

        elif action == "activate":
            user.is_active = True
            user.save()
            return Response({"message": f"{user.email} activated"})

        elif action == "reset_password":
            new_password = request.data.get("new_password")
            if not new_password:
                return Response({"error": "new_password required"}, status=status.HTTP_400_BAD_REQUEST)
            user.set_password(new_password)
            user.save()
            return Response({"message": f"Password reset for {user.email}"})

        return Response({"error": "Invalid action"}, status=status.HTTP_400_BAD_REQUEST)


class AdminAnalyticsView(APIView):
    permission_classes = [IsSuperUser]

    def get(self, request):
        now = timezone.now()

        # Growth — new tenants per month for last 6 months
        growth = []
        for i in range(5, -1, -1):
            month_start = (now - relativedelta(months=i)).replace(
                day=1, hour=0, minute=0, second=0, microsecond=0
            )
            month_end = month_start + relativedelta(months=1)
            count = Tenant.objects.filter(
                created_at__gte=month_start,
                created_at__lt=month_end,
            ).count()
            growth.append({
                "month": month_start.strftime("%b %Y"),
                "new_businesses": count,
            })

        # Top plans by subscriber count
        top_plans = []
        for plan in Plan.objects.filter(is_active=True):
            count = Subscription.objects.filter(
                plan=plan, status="ACTIVE"
            ).count()
            top_plans.append({
                "plan": plan.name,
                "active_subscribers": count,
                "price_kes": float(plan.price_kes),
            })
        top_plans.sort(key=lambda x: x["active_subscribers"], reverse=True)

        # Churn — subscriptions that expired this month
        this_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        churn = Subscription.objects.filter(
            status="EXPIRED",
            end_date__gte=this_month_start.date(),
        ).count()

        # Conversion — tenants with at least one SUCCESS transaction
        total_tenants = Tenant.objects.count()
        converted = Tenant.objects.filter(
            transactions__status="SUCCESS"
        ).distinct().count()
        conversion_rate = round((converted / total_tenants * 100), 1) if total_tenants > 0 else 0

        return Response({
            "growth": growth,
            "top_plans": top_plans,
            "churn_this_month": churn,
            "conversion_rate": conversion_rate,
            "total_tenants": total_tenants,
            "converted_tenants": converted,
        })


class AdminFailedPaymentsView(APIView):
    permission_classes = [IsSuperUser]

    def get(self, request):
        failed = Transaction.objects.filter(
            status="FAILED"
        ).select_related("tenant", "user").order_by("-created_at")

        data = [
            {
                "id": str(t.id),
                "business": t.tenant.name if t.tenant else "—",
                "phone": t.phone,
                "amount": float(t.amount),
                "reason": self._get_reason(t.callback_raw),
                "created_at": t.created_at.strftime("%Y-%m-%d %H:%M"),
            }
            for t in failed
        ]

        return Response({"failed_payments": data})

    def _get_reason(self, callback_raw):
        if not callback_raw:
            return "Unknown"
        try:
            result_desc = callback_raw["Body"]["stkCallback"]["ResultDesc"]
            return result_desc
        except (KeyError, TypeError):
            return "Unknown"


class AdminRetryPaymentView(APIView):
    permission_classes = [IsSuperUser]

    def post(self, request, transaction_id):
        try:
            transaction = Transaction.objects.get(id=transaction_id, status="FAILED")
        except Transaction.DoesNotExist:
            return Response({"error": "Failed transaction not found"}, status=status.HTTP_404_NOT_FOUND)

        from tasks.payment_tasks import retry_failed_payment
        retry_failed_payment.apply_async(args=[str(transaction.id)])

        return Response({"message": "Payment retry queued successfully"})

# ─── TENANT DASHBOARD VIEWS ──────────────────────────────────────────────────

class TenantOverviewView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant = request.tenant

        if not tenant:
            return Response(
                {"error": "No tenant found. Complete business setup first."},
                status=status.HTTP_400_BAD_REQUEST
            )

        now = timezone.now()
        this_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        thirty_days_ago = now - timedelta(days=30)

        # Revenue
        total_revenue = Transaction.objects.filter(
            tenant=tenant, status="SUCCESS"
        ).aggregate(total=Sum("amount"))["total"] or 0

        this_month_revenue = Transaction.objects.filter(
            tenant=tenant, status="SUCCESS",
            created_at__gte=this_month_start,
        ).aggregate(total=Sum("amount"))["total"] or 0

        # Subscriptions
        active_subs = Subscription.objects.filter(
            user__tenant=tenant, status="ACTIVE"
        ).count()

        expiring_soon = Subscription.objects.filter(
            user__tenant=tenant,
            status="ACTIVE",
            end_date__lte=(now + timedelta(days=7)).date(),
            end_date__gte=now.date(),
        ).count()

        # Payments
        failed_count = Transaction.objects.filter(
            tenant=tenant, status="FAILED",
            created_at__gte=thirty_days_ago,
        ).count()

        successful_count = Transaction.objects.filter(
            tenant=tenant, status="SUCCESS",
            created_at__gte=thirty_days_ago,
        ).count()

        total_attempts = failed_count + successful_count
        success_rate = round(
            (successful_count / total_attempts * 100), 1
        ) if total_attempts > 0 else 0

        # Daily revenue chart — last 30 days
        daily_revenue = []
        for i in range(29, -1, -1):
            day = now.date() - timedelta(days=i)
            day_total = Transaction.objects.filter(
                tenant=tenant, status="SUCCESS",
                created_at__date=day,
            ).aggregate(total=Sum("amount"))["total"] or 0
            daily_revenue.append({
                "date": day.strftime("%b %d"),
                "revenue": float(day_total),
            })

        return Response({
            "total_revenue": float(total_revenue),
            "this_month_revenue": float(this_month_revenue),
            "active_subscriptions": active_subs,
            "expiring_soon": expiring_soon,
            "failed_payments_30d": failed_count,
            "success_rate": success_rate,
            "daily_revenue": daily_revenue,
        })


class TenantPaymentsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant = request.tenant
        if not tenant:
            return Response({"error": "No tenant found."}, status=400)

        transactions = Transaction.objects.filter(
            tenant=tenant
        ).order_by("-created_at")

        # Filters
        status_filter = request.query_params.get("status")
        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")
        phone = request.query_params.get("phone")

        if status_filter:
            transactions = transactions.filter(status=status_filter.upper())
        if date_from:
            transactions = transactions.filter(created_at__date__gte=date_from)
        if date_to:
            transactions = transactions.filter(created_at__date__lte=date_to)
        if phone:
            transactions = transactions.filter(phone__icontains=phone)

        data = [
            {
                "id": str(t.id),
                "phone": t.phone,
                "amount": float(t.amount),
                "status": t.status,
                "mpesa_receipt": t.mpesa_receipt or "—",
                "created_at": t.created_at.strftime("%Y-%m-%d %H:%M"),
                "reason": self._get_reason(t.callback_raw) if t.status == "FAILED" else None,
            }
            for t in transactions[:100]
        ]

        return Response({"transactions": data})

    def _get_reason(self, callback_raw):
        if not callback_raw:
            return "Unknown"
        try:
            return callback_raw["Body"]["stkCallback"]["ResultDesc"]
        except (KeyError, TypeError):
            return "Unknown"


class TenantCustomersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant = request.tenant
        if not tenant:
            return Response({"error": "No tenant found."}, status=400)

        # Get unique phone numbers that have transacted with this tenant
        from django.db.models import Max, Count

        customers_qs = Transaction.objects.filter(
            tenant=tenant
        ).values("phone").annotate(
            last_payment=Max("created_at"),
            total_spent=Sum("amount"),
            total_transactions=Count("id"),
        ).order_by("-last_payment")

        data = []
        for c in customers_qs:
            # Get latest subscription for this phone
            latest_sub = Subscription.objects.filter(
                user__tenant=tenant,
                user__phone=c["phone"],
            ).select_related("plan").order_by("-created_at").first()

            data.append({
                "phone": c["phone"],
                "last_payment": c["last_payment"].strftime("%Y-%m-%d"),
                "total_spent": float(c["total_spent"] or 0),
                "total_transactions": c["total_transactions"],
                "plan": latest_sub.plan.name if latest_sub else "—",
                "subscription_status": latest_sub.status if latest_sub else "NONE",
            })

        return Response({"customers": data})


class TenantSubscriptionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant = request.tenant
        if not tenant:
            return Response({"error": "No tenant found."}, status=400)

        now = timezone.now()
        seven_days = (now + timedelta(days=7)).date()

        def serialize(sub):
            return {
                "id": str(sub.id),
                "phone": sub.user.phone if hasattr(sub.user, "phone") else "—",
                "plan": sub.plan.name,
                "price_kes": float(sub.plan.price_kes),
                "status": sub.status,
                "start_date": sub.start_date.strftime("%Y-%m-%d"),
                "end_date": sub.end_date.strftime("%Y-%m-%d"),
                "days_left": (sub.end_date - now.date()).days,
            }

        active = Subscription.objects.filter(
            user__tenant=tenant, status="ACTIVE"
        ).select_related("plan", "user").order_by("end_date")

        expiring = Subscription.objects.filter(
            user__tenant=tenant, status="ACTIVE",
            end_date__lte=seven_days,
            end_date__gte=now.date(),
        ).select_related("plan", "user").order_by("end_date")

        expired = Subscription.objects.filter(
            user__tenant=tenant, status="EXPIRED"
        ).select_related("plan", "user").order_by("-end_date")[:20]

        return Response({
            "active": [serialize(s) for s in active],
            "expiring_soon": [serialize(s) for s in expiring],
            "recently_expired": [serialize(s) for s in expired],
        })


class TenantAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant = request.tenant
        if not tenant:
            return Response({"error": "No tenant found."}, status=400)

        now = timezone.now()

        # Monthly revenue trend — last 6 months
        monthly_trend = []
        for i in range(5, -1, -1):
            month_start = (now - relativedelta(months=i)).replace(
                day=1, hour=0, minute=0, second=0, microsecond=0
            )
            month_end = month_start + relativedelta(months=1)
            total = Transaction.objects.filter(
                tenant=tenant, status="SUCCESS",
                created_at__gte=month_start,
                created_at__lt=month_end,
            ).aggregate(total=Sum("amount"))["total"] or 0
            monthly_trend.append({
                "month": month_start.strftime("%b %Y"),
                "revenue": float(total),
            })

        # Payment success rate
        total_tx = Transaction.objects.filter(tenant=tenant).count()
        success_tx = Transaction.objects.filter(tenant=tenant, status="SUCCESS").count()
        success_rate = round((success_tx / total_tx * 100), 1) if total_tx > 0 else 0

        # Churn — expired this month vs last month
        this_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        last_month_start = this_month_start - relativedelta(months=1)

        churn_this_month = Subscription.objects.filter(
            user__tenant=tenant, status="EXPIRED",
            end_date__gte=this_month_start.date(),
        ).count()

        churn_last_month = Subscription.objects.filter(
            user__tenant=tenant, status="EXPIRED",
            end_date__gte=last_month_start.date(),
            end_date__lt=this_month_start.date(),
        ).count()

        # Top customers by spend
        from django.db.models import Sum as DSum
        top_customers = Transaction.objects.filter(
            tenant=tenant, status="SUCCESS"
        ).values("phone").annotate(
            total=DSum("amount")
        ).order_by("-total")[:5]

        top_customers_data = [
            {"phone": c["phone"], "total_spent": float(c["total"])}
            for c in top_customers
        ]

        # Peak payment days
        from django.db.models.functions import ExtractDay
        peak_days = Transaction.objects.filter(
            tenant=tenant, status="SUCCESS"
        ).annotate(
            day=ExtractDay("created_at")
        ).values("day").annotate(
            count=Count("id")
        ).order_by("-count")[:5]

        peak_days_data = [
            {"day": f"Day {p['day']}", "payments": p["count"]}
            for p in peak_days
        ]

        return Response({
            "monthly_trend": monthly_trend,
            "success_rate": success_rate,
            "churn_this_month": churn_this_month,
            "churn_last_month": churn_last_month,
            "top_customers": top_customers_data,
            "peak_days": peak_days_data,
        })


class TenantSettingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant = request.tenant
        if not tenant:
            return Response({"error": "No tenant found."}, status=400)

        sub = Subscription.objects.filter(
            user__tenant=tenant, status="ACTIVE"
        ).select_related("plan").order_by("-created_at").first()

        plan_name = sub.plan.name if sub else "Starter"
        tier_map = {"Starter":1, "Pro":2, "Enterprise":3}
        tier = tier_map.get(plan_name, 1)

        return Response({
            "business_name": tenant.name,
            "slug": tenant.slug,
            "owner_email": request.user.email,
            "is_active": tenant.is_active,
            "current_plan": plan_name,
            "tier": tier,
            "plan_price": float(sub.plan.price_kes) if sub else 0,
            "next_billing": sub.end_date.strftime("%Y-%m-%d") if sub else None,
        })

    def patch(self, request):
        tenant = request.tenant
        if not tenant:
            return Response({"error": "No tenant found."}, status=400)

        if "business_name" in request.data:
            tenant.name = request.data["business_name"]
            tenant.save()

        if "email" in request.data:
            request.user.email = request.data["email"]
            request.user.save()

        return Response({"message": "Settings updated successfully"})

# ─── TENANT DASHBOARD VIEWS ──────────────────────────────────────────────────

class TenantOverviewView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant = request.tenant

        if not tenant:
            return Response(
                {"error": "No tenant found. Complete business setup first."},
                status=status.HTTP_400_BAD_REQUEST
            )

        now = timezone.now()
        this_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        thirty_days_ago = now - timedelta(days=30)

        # Revenue
        total_revenue = Transaction.objects.filter(
            tenant=tenant, status="SUCCESS"
        ).aggregate(total=Sum("amount"))["total"] or 0

        this_month_revenue = Transaction.objects.filter(
            tenant=tenant, status="SUCCESS",
            created_at__gte=this_month_start,
        ).aggregate(total=Sum("amount"))["total"] or 0

        # Subscriptions
        active_subs = Subscription.objects.filter(
            user__tenant=tenant, status="ACTIVE"
        ).count()

        expiring_soon = Subscription.objects.filter(
            user__tenant=tenant,
            status="ACTIVE",
            end_date__lte=(now + timedelta(days=7)).date(),
            end_date__gte=now.date(),
        ).count()

        # Payments
        failed_count = Transaction.objects.filter(
            tenant=tenant, status="FAILED",
            created_at__gte=thirty_days_ago,
        ).count()

        successful_count = Transaction.objects.filter(
            tenant=tenant, status="SUCCESS",
            created_at__gte=thirty_days_ago,
        ).count()

        total_attempts = failed_count + successful_count
        success_rate = round(
            (successful_count / total_attempts * 100), 1
        ) if total_attempts > 0 else 0

        # Daily revenue chart — last 30 days
        daily_revenue = []
        for i in range(29, -1, -1):
            day = now.date() - timedelta(days=i)
            day_total = Transaction.objects.filter(
                tenant=tenant, status="SUCCESS",
                created_at__date=day,
            ).aggregate(total=Sum("amount"))["total"] or 0
            daily_revenue.append({
                "date": day.strftime("%b %d"),
                "revenue": float(day_total),
            })

        return Response({
            "total_revenue": float(total_revenue),
            "this_month_revenue": float(this_month_revenue),
            "active_subscriptions": active_subs,
            "expiring_soon": expiring_soon,
            "failed_payments_30d": failed_count,
            "success_rate": success_rate,
            "daily_revenue": daily_revenue,
        })


class TenantPaymentsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant = request.tenant
        if not tenant:
            return Response({"error": "No tenant found."}, status=400)

        transactions = Transaction.objects.filter(
            tenant=tenant
        ).order_by("-created_at")

        # Filters
        status_filter = request.query_params.get("status")
        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")
        phone = request.query_params.get("phone")

        if status_filter:
            transactions = transactions.filter(status=status_filter.upper())
        if date_from:
            transactions = transactions.filter(created_at__date__gte=date_from)
        if date_to:
            transactions = transactions.filter(created_at__date__lte=date_to)
        if phone:
            transactions = transactions.filter(phone__icontains=phone)

        data = [
            {
                "id": str(t.id),
                "phone": t.phone,
                "amount": float(t.amount),
                "status": t.status,
                "mpesa_receipt": t.mpesa_receipt or "—",
                "created_at": t.created_at.strftime("%Y-%m-%d %H:%M"),
                "reason": self._get_reason(t.callback_raw) if t.status == "FAILED" else None,
            }
            for t in transactions[:100]
        ]

        return Response({"transactions": data})

    def _get_reason(self, callback_raw):
        if not callback_raw:
            return "Unknown"
        try:
            return callback_raw["Body"]["stkCallback"]["ResultDesc"]
        except (KeyError, TypeError):
            return "Unknown"


class TenantCustomersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant = request.tenant
        if not tenant:
            return Response({"error": "No tenant found."}, status=400)

        # Get unique phone numbers that have transacted with this tenant
        from django.db.models import Max, Count

        customers_qs = Transaction.objects.filter(
            tenant=tenant
        ).values("phone").annotate(
            last_payment=Max("created_at"),
            total_spent=Sum("amount"),
            total_transactions=Count("id"),
        ).order_by("-last_payment")

        data = []
        for c in customers_qs:
            # Get latest subscription for this phone
            latest_sub = Subscription.objects.filter(
                user__tenant=tenant,
                user__phone=c["phone"],
            ).select_related("plan").order_by("-created_at").first()

            data.append({
                "phone": c["phone"],
                "last_payment": c["last_payment"].strftime("%Y-%m-%d"),
                "total_spent": float(c["total_spent"] or 0),
                "total_transactions": c["total_transactions"],
                "plan": latest_sub.plan.name if latest_sub else "—",
                "subscription_status": latest_sub.status if latest_sub else "NONE",
            })

        return Response({"customers": data})


class TenantSubscriptionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant = request.tenant
        if not tenant:
            return Response({"error": "No tenant found."}, status=400)

        now = timezone.now()
        seven_days = (now + timedelta(days=7)).date()

        def serialize(sub):
            return {
                "id": str(sub.id),
                "phone": sub.user.phone if hasattr(sub.user, "phone") else "—",
                "plan": sub.plan.name,
                "price_kes": float(sub.plan.price_kes),
                "status": sub.status,
                "start_date": sub.start_date.strftime("%Y-%m-%d"),
                "end_date": sub.end_date.strftime("%Y-%m-%d"),
                "days_left": (sub.end_date - now.date()).days,
            }

        active = Subscription.objects.filter(
            user__tenant=tenant, status="ACTIVE"
        ).select_related("plan", "user").order_by("end_date")

        expiring = Subscription.objects.filter(
            user__tenant=tenant, status="ACTIVE",
            end_date__lte=seven_days,
            end_date__gte=now.date(),
        ).select_related("plan", "user").order_by("end_date")

        expired = Subscription.objects.filter(
            user__tenant=tenant, status="EXPIRED"
        ).select_related("plan", "user").order_by("-end_date")[:20]

        return Response({
            "active": [serialize(s) for s in active],
            "expiring_soon": [serialize(s) for s in expiring],
            "recently_expired": [serialize(s) for s in expired],
        })


class TenantAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant = request.tenant
        if not tenant:
            return Response({"error": "No tenant found."}, status=400)

        now = timezone.now()

        # Monthly revenue trend — last 6 months
        monthly_trend = []
        for i in range(5, -1, -1):
            month_start = (now - relativedelta(months=i)).replace(
                day=1, hour=0, minute=0, second=0, microsecond=0
            )
            month_end = month_start + relativedelta(months=1)
            total = Transaction.objects.filter(
                tenant=tenant, status="SUCCESS",
                created_at__gte=month_start,
                created_at__lt=month_end,
            ).aggregate(total=Sum("amount"))["total"] or 0
            monthly_trend.append({
                "month": month_start.strftime("%b %Y"),
                "revenue": float(total),
            })

        # Payment success rate
        total_tx = Transaction.objects.filter(tenant=tenant).count()
        success_tx = Transaction.objects.filter(tenant=tenant, status="SUCCESS").count()
        success_rate = round((success_tx / total_tx * 100), 1) if total_tx > 0 else 0

        # Churn — expired this month vs last month
        this_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        last_month_start = this_month_start - relativedelta(months=1)

        churn_this_month = Subscription.objects.filter(
            user__tenant=tenant, status="EXPIRED",
            end_date__gte=this_month_start.date(),
        ).count()

        churn_last_month = Subscription.objects.filter(
            user__tenant=tenant, status="EXPIRED",
            end_date__gte=last_month_start.date(),
            end_date__lt=this_month_start.date(),
        ).count()

        # Top customers by spend
        from django.db.models import Sum as DSum
        top_customers = Transaction.objects.filter(
            tenant=tenant, status="SUCCESS"
        ).values("phone").annotate(
            total=DSum("amount")
        ).order_by("-total")[:5]

        top_customers_data = [
            {"phone": c["phone"], "total_spent": float(c["total"])}
            for c in top_customers
        ]

        # Peak payment days
        from django.db.models.functions import ExtractDay
        peak_days = Transaction.objects.filter(
            tenant=tenant, status="SUCCESS"
        ).annotate(
            day=ExtractDay("created_at")
        ).values("day").annotate(
            count=Count("id")
        ).order_by("-count")[:5]

        peak_days_data = [
            {"day": f"Day {p['day']}", "payments": p["count"]}
            for p in peak_days
        ]

        return Response({
            "monthly_trend": monthly_trend,
            "success_rate": success_rate,
            "churn_this_month": churn_this_month,
            "churn_last_month": churn_last_month,
            "top_customers": top_customers_data,
            "peak_days": peak_days_data,
        })


class TenantSettingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant = request.tenant
        if not tenant:
            return Response({"error": "No tenant found."}, status=400)

        sub = Subscription.objects.filter(
            user__tenant=tenant, status="ACTIVE"
        ).select_related("plan").order_by("-created_at").first()

        return Response({
            "business_name": tenant.name,
            "slug": tenant.slug,
            "owner_email": request.user.email,
            "is_active": tenant.is_active,
            "current_plan": sub.plan.name if sub else "No active plan",
            "plan_price": float(sub.plan.price_kes) if sub else 0,
            "next_billing": sub.end_date.strftime("%Y-%m-%d") if sub else None,
        })

    def patch(self, request):
        tenant = request.tenant
        if not tenant:
            return Response({"error": "No tenant found."}, status=400)

        if "business_name" in request.data:
            tenant.name = request.data["business_name"]
            tenant.save()

        if "email" in request.data:
            request.user.email = request.data["email"]
            request.user.save()

        return Response({"message": "Settings updated successfully"})