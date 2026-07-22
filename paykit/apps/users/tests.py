from unittest.mock import Mock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from allauth.socialaccount.models import SocialAccount


@override_settings(GOOGLE_CLIENT_ID="paykit-client.apps.googleusercontent.com")
class GoogleLoginViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    @patch("apps.users.views.http_requests.get")
    def test_creates_user_for_a_valid_token_issued_to_paykit(self, mock_get):
        token_info = Mock(status_code=200)
        token_info.json.return_value = {"aud": "paykit-client.apps.googleusercontent.com"}
        userinfo = Mock(status_code=200)
        userinfo.json.return_value = {
            "sub": "google-user-123",
            "email": "owner@example.com",
            "email_verified": True,
            "name": "Pay Kit",
        }
        mock_get.side_effect = [token_info, userinfo]

        response = self.client.post("/api/users/google/", {"access_token": "valid-token"}, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["is_new_user"])
        user = get_user_model().objects.get(email="owner@example.com")
        self.assertEqual(user.username, "owner")
        self.assertTrue(
            SocialAccount.objects.filter(user=user, provider="google", uid="google-user-123").exists()
        )

    @patch("apps.users.views.http_requests.get")
    def test_rejects_token_for_another_google_client(self, mock_get):
        token_info = Mock(status_code=200)
        token_info.json.return_value = {"aud": "another-client.apps.googleusercontent.com"}
        mock_get.return_value = token_info

        response = self.client.post("/api/users/google/", {"access_token": "wrong-audience"}, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.data["error"],
            "This Google sign-in token was issued for a different application.",
        )
        self.assertEqual(mock_get.call_count, 1)

# Create your tests here.
