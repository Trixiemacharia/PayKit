import base64
import requests
from datetime import datetime
from django.core.cache import cache
from django.conf import settings


class DarajaClient:
    def __init__(self):
        self.consumer_key = settings.DARAJA_CONSUMER_KEY
        self.consumer_secret = settings.DARAJA_CONSUMER_SECRET
        self.shortcode = settings.DARAJA_SHORTCODE
        self.passkey = settings.DARAJA_PASSKEY
        self.base_url = "https://sandbox.safaricom.co.ke"

    def get_access_token(self):
        cached_token = cache.get("daraja_access_token")
        if cached_token:
            return cached_token

        auth_string = f"{self.consumer_key}:{self.consumer_secret}"
        encoded = base64.b64encode(auth_string.encode()).decode()

        response = requests.get(
            f"{self.base_url}/oauth/v1/generate?grant_type=client_credentials",
            headers={"Authorization": f"Basic {encoded}"},
        )
        response.raise_for_status()
        token = response.json()["access_token"]

        cache.set("daraja_access_token", token, timeout=3500)
        return token
    def stk_push(self, phone, amount, account_reference, transaction_desc):
        token = self.get_access_token()
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")

        password_string = f"{self.shortcode}{self.passkey}{timestamp}"
        password = base64.b64encode(password_string.encode()).decode()

        payload = {
            "BusinessShortCode": self.shortcode,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": int(amount),
            "PartyA": phone,
            "PartyB": self.shortcode,
            "PhoneNumber": phone,
            "CallBackURL": settings.DARAJA_CALLBACK_URL,
            "AccountReference": account_reference[:12],
            "TransactionDesc": transaction_desc[:13],
        }

        response = requests.post(
            f"{self.base_url}/mpesa/stkpush/v1/processrequest",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
        )
        response.raise_for_status()
        return response.json()