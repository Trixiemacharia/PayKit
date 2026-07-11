from django.urls import path
from .views import (
    DashboardStatsView,
    RecentTransactionsView,
    AdminOverviewView,
    AdminBusinessesView,
    AdminBusinessActionView,
    AdminRevenueView,
    AdminTransactionsView,
    AdminUsersView,
    AdminUserActionView,
    AdminAnalyticsView,
    AdminFailedPaymentsView,
    AdminRetryPaymentView,
    TenantOverviewView,
    TenantPaymentsView,
    TenantCustomersView,
    TenantSubscriptionsView,
    TenantAnalyticsView,
    TenantSettingsView,
)

urlpatterns = [
    # Tenant dashboard
    path("stats/", DashboardStatsView.as_view(), name="dashboard-stats"),
    path("transactions/", RecentTransactionsView.as_view(), name="recent-transactions"),
    path("tenant/overview/", TenantOverviewView.as_view(), name="tenant-overview"),
    path("tenant/payments/", TenantPaymentsView.as_view(), name="tenant-payments"),
    path("tenant/customers/", TenantCustomersView.as_view(), name="tenant-customers"),
    path("tenant/subscriptions/", TenantSubscriptionsView.as_view(), name="tenant-subscriptions"),
    path("tenant/analytics/", TenantAnalyticsView.as_view(), name="tenant-analytics"),
    path("tenant/settings/", TenantSettingsView.as_view(), name="tenant-settings"),

    # Admin dashboard
    path("admin/overview/", AdminOverviewView.as_view(), name="admin-overview"),
    path("admin/businesses/", AdminBusinessesView.as_view(), name="admin-businesses"),
    path("admin/businesses/<uuid:tenant_id>/", AdminBusinessActionView.as_view(), name="admin-business-action"),
    path("admin/revenue/", AdminRevenueView.as_view(), name="admin-revenue"),
    path("admin/transactions/", AdminTransactionsView.as_view(), name="admin-transactions"),
    path("admin/users/", AdminUsersView.as_view(), name="admin-users"),
    path("admin/users/<uuid:user_id>/", AdminUserActionView.as_view(), name="admin-user-action"),
    path("admin/analytics/", AdminAnalyticsView.as_view(), name="admin-analytics"),
    path("admin/failed-payments/", AdminFailedPaymentsView.as_view(), name="admin-failed-payments"),
    path("admin/retry/<uuid:transaction_id>/", AdminRetryPaymentView.as_view(), name="admin-retry"),
]