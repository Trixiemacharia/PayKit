from django.urls import path
from .views import STKPushView, PaymentStatusView

urlpatterns = [
    path("stk-push/", STKPushView.as_view(), name="stk-push"),
    path("status/<str:checkout_request_id>/", PaymentStatusView.as_view(), name="payment-status"),
]