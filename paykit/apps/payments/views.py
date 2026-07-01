from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from config.daraja import DarajaClient
from .models import Transaction
from .serializers import STKPushSerializer


class STKPushView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = STKPushSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        phone = serializer.validated_data["phone"]
        amount = serializer.validated_data["amount"]

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
            )
        except Transaction.DoesNotExist:
            return Response({"error": "Transaction not found"}, status=status.HTTP_404_NOT_FOUND)

        return Response({
            "status": transaction.status,
            "mpesa_receipt": transaction.mpesa_receipt,
            "amount": transaction.amount,
            "phone": transaction.phone,
        })