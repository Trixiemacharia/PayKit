from django.contrib import admin
from django.urls import path,include
from rest_framework_simplejwt.views import TokenRefreshView
from apps.users.serializers import CustomTokenView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/token/', CustomTokenView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/tenants/',include('apps.tenants.urls')),
    path('api/users/',include('apps.users.urls')),
    path('api/payments/',include('apps.payments.urls')),
    path('api/webhooks/',include('apps.webhooks.urls')),
    path('api/subscriptions/',include('apps.subscriptions.urls')),
    path('api/dashboard/',include('apps.dashboard.urls')),
]
