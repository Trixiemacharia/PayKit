from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from django.utils.decorators import method_decorator
from django_ratelimit.decorators import ratelimit


class CustomTokenSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Add custom claims to the token
        token["is_superuser"] = user.is_superuser
        token["username"] = user.username
        token["email"] = user.email
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        # Also return is_superuser in the response body
        # so React can read it without decoding the JWT
        data["is_superuser"] = self.user.is_superuser
        data["username"] = self.user.username
        return data

@method_decorator(ratelimit(key="ip", rate="10/m", block=True), name="post")
class CustomTokenView(TokenObtainPairView):
    serializer_class = CustomTokenSerializer