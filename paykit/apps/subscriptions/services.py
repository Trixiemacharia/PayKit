from datetime import date
from dateutil.relativedelta import relativedelta
from .models import Subscription, Plan


def activate_subscription(user, plan, transaction):
    """
    Called when a payment succeeds.
    Creates a new subscription or extends an existing one.
    """
    today = date.today()

    # Check if user already has an active subscription for this plan
    existing = Subscription.objects.filter(
        user=user,
        plan=plan,
        status="ACTIVE"
    ).first()

    if existing:
        # Extend from current end_date instead of today
        # so the user doesn't lose any days they already paid for
        new_end = existing.end_date + relativedelta(months=1) \
            if plan.billing_cycle == "MONTHLY" \
            else existing.end_date + relativedelta(years=1)

        existing.end_date = new_end
        existing.next_billing = new_end
        existing.transaction = transaction
        existing.save()
        return existing
    else:
        # Create a brand new subscription
        if plan.billing_cycle == "MONTHLY":
            end_date = today + relativedelta(months=1)
        else:
            end_date = today + relativedelta(years=1)

        return Subscription.objects.create(
            user=user,
            plan=plan,
            transaction=transaction,
            status="ACTIVE",
            start_date=today,
            end_date=end_date,
            next_billing=end_date,
        )