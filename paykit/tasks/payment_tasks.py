from celery import shared_task
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
import logging

logger = logging.getLogger(__name__)


@shared_task
def expire_subscriptions():
    """
    Runs daily at midnight.
    Finds all subscriptions past their end_date and marks them EXPIRED.
    """
    from apps.subscriptions.models import Subscription

    today = date.today()
    expired = Subscription.objects.filter(
        status="ACTIVE",
        end_date__lt=today
    )

    count = expired.count()
    expired.update(status="EXPIRED")

    logger.info(f"Expired {count} subscriptions on {today}")
    return f"Expired {count} subscriptions"


@shared_task
def notify_expiring_subscriptions():
    """
    Runs daily at 9am.
    Finds subscriptions expiring within 7 days and sends an email
    notification to the tenant owner.
    """
    from apps.subscriptions.models import Subscription
    from django.core.mail import send_mail
    from django.conf import settings

    today = date.today()
    seven_days_later = today + timedelta(days=7)

    # Find subscriptions expiring within the next 7 days
    expiring = Subscription.objects.filter(
        status="ACTIVE",
        end_date__gte=today,
        end_date__lte=seven_days_later,
    ).select_related("user", "plan", "user__tenant")

    notified = 0
    for sub in expiring:
        days_left = (sub.end_date - today).days
        owner = sub.user
        tenant = getattr(owner, "tenant", None)
        business_name = tenant.name if tenant else "Your business"
        plan_name = sub.plan.name
        price = sub.plan.price_kes

        subject = f"⚠️ Your PayKit subscription expires in {days_left} day{'s' if days_left != 1 else ''}"

        message = f"""
Hi {owner.username},

Your {plan_name} subscription for {business_name} expires on {sub.end_date.strftime("%B %d, %Y")} — that's {days_left} day{'s' if days_left != 1 else ''} from now.

To keep your dashboard and payment features active, renew your subscription before it expires.

Plan:     {plan_name}
Amount:   KES {price:,.0f}/month
Expires:  {sub.end_date.strftime("%B %d, %Y")}

Log in to your PayKit dashboard to renew:
http://localhost:3000/dashboard

If you have any questions, reply to this email.

— The PayKit Team
        """.strip()

        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[owner.email],
                fail_silently=False,
            )
            notified += 1
            logger.info(f"Notified {owner.email} — {days_left} days left on {plan_name}")
        except Exception as e:
            logger.error(f"Failed to notify {owner.email}: {e}")

    return f"Notified {notified} subscriptions expiring within 7 days"


@shared_task(bind=True, max_retries=3)
def retry_failed_payment(self, transaction_id, plan_id=None):
    """
    Retries a failed STK Push up to 3 times with 5-minute gaps.
    Only runs if the tenant's plan has retry_failed_payments=True.
    """
    from apps.payments.models import Transaction
    from apps.subscriptions.models import Subscription
    from config.daraja import DarajaClient

    try:
        transaction = Transaction.objects.get(id=transaction_id)

        # Check if tenant's plan allows retries
        if transaction.tenant:
            sub = Subscription.objects.filter(
                user__tenant=transaction.tenant,
                status="ACTIVE"
            ).select_related("plan").first()

            if sub and not sub.plan.features.get("retry_failed_payments", False):
                logger.info(f"Retry skipped — {sub.plan.name} plan does not include retries")
                return "Retry not available on this plan"

        daraja = DarajaClient()
        response = daraja.stk_push(
            phone=transaction.phone,
            amount=transaction.amount,
            account_reference="PayKit",
            transaction_desc="Subscription retry",
        )
        transaction.checkout_request_id = response.get("CheckoutRequestID")
        transaction.status = "PENDING"
        transaction.save()

    except Exception as exc:
        logger.error(f"Retry failed for transaction {transaction_id}: {exc}")
        raise self.retry(exc=exc, countdown=300)