import uuid
from django.db import models

# Create your models here.
class WebhookLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event_type = models.CharField(max_length=50)
    payload = models.JSONField()
    result_code = models.IntegerField(null=True, blank=True)
    success = models.BooleanField(default=False)
    processed_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.event_type} - {self.result_code} - {self.processed_at}"