from celery import shared_task
from datetime import date
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


@shared_task(bind=True, max_retries=3)
def retry_failed_payment(self, transaction_id, plan_id):
    """
    Called when a payment fails.
    Retries the STK Push up to 3 times with a 5-minute gap between attempts.
    """
    from apps.payments.models import Transaction
    from config.daraja import DarajaClient

    try:
        transaction = Transaction.objects.get(id=transaction_id)
        daraja = DarajaClient()
        response = daraja.stk_push(
            phone=transaction.phone,
            amount=transaction.amount,
            account_reference="PayKit",
            transaction_desc="Subscription retry",
        )
        # Update the transaction with the new checkout request ID
        transaction.checkout_request_id = response.get("CheckoutRequestID")
        transaction.status = "PENDING"
        transaction.save()

    except Exception as exc:
        logger.error(f"Retry failed for transaction {transaction_id}: {exc}")
        # Wait 5 minutes (300 seconds) before trying again
        raise self.retry(exc=exc, countdown=300)