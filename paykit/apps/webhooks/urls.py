from django.urls import path
from .views import DarajaCallbackView

urlpatterns = [
    path("daraja/callback/", DarajaCallbackView.as_view(), name="daraja-callback"),
]