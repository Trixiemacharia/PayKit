import json
from django.views import View
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

from apps.payments.models import Transaction
from .models import WebhookLog


@method_decorator(csrf_exempt, name="dispatch")
class DarajaCallbackView(View):

    def post(self, request):
        try:
            payload = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"ResultCode": 1, "ResultDesc": "Invalid JSON"}, status=400)

        # Save the raw payload immediately — before any processing
        WebhookLog.objects.create(
            event_type="stk_callback",
            payload=payload,
        )

        try:
            stk_callback = payload["Body"]["stkCallback"]
            result_code = stk_callback["ResultCode"]
            checkout_request_id = stk_callback["CheckoutRequestID"]
        except KeyError:
            return JsonResponse({"ResultCode": 0, "ResultDesc": "Accepted"})

        try:
            transaction = Transaction.objects.get(checkout_request_id=checkout_request_id)
        except Transaction.DoesNotExist:
            return JsonResponse({"ResultCode": 0, "ResultDesc": "Accepted"})

        if result_code == 0:
            # Payment succeeded — extract the receipt number
            metadata_items = stk_callback.get("CallbackMetadata", {}).get("Item", [])
            receipt = next(
                (item["Value"] for item in metadata_items if item["Name"] == "MpesaReceiptNumber"),
                None
            )
            transaction.status = "SUCCESS"
            transaction.mpesa_receipt = receipt
        else:
            transaction.status = "FAILED"

        transaction.callback_raw = payload
        transaction.save()

        # Always return this exact response to Safaricom — anything else confuses their system
        return JsonResponse({"ResultCode": 0, "ResultDesc": "Accepted"})