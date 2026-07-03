import uuid
from django.db import models
from django.conf import settings

# Create your models here.
class Plan(models.Model):
    BILLING_CYCLE_CHOICES = [
        ("MONTHLY", "Monthly"),
        ("ANNUAL", "Annual"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50)
    price_kes = models.DecimalField(max_digits=10, decimal_places=2)
    billing_cycle = models.CharField(max_length=10, choices=BILLING_CYCLE_CHOICES, default="MONTHLY")
    features = models.JSONField(default=dict)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} - KES{self.price_kes}/{self.billing_cycle}"


class Subscription(models.Model):
    STATUS_CHOICES = [
        ("ACTIVE", "Active"),
        ("EXPIRED", "Expired"),
        ("CANCELLED", "Cancelled"),
        ("PAST_DUE", "Past Due"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="subscriptions"
    )
    plan = models.ForeignKey(Plan, on_delete=models.PROTECT, related_name="subscriptions")
    transaction = models.ForeignKey(
        "payments.Transaction",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="subscription"
    )
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="ACTIVE")
    start_date = models.DateField()
    end_date = models.DateField()
    next_billing = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user} - {self.plan.name} - {self.status}"