from django.urls import path
from .views import RegisterView, CreateTenantView, ListPlansView,GoogleLoginView

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("create-tenant/", CreateTenantView.as_view(), name="create-tenant"),
    path("plans/", ListPlansView.as_view(), name="list-plans"),
    path("google/", GoogleLoginView.as_view(), name="google-login"),
]