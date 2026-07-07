from django.urls import path
from .views import DashboardStatsView, RecentTransactionsView

urlpatterns = [
    path("stats/", DashboardStatsView.as_view(), name="dashboard-stats"),
    path("transactions/", RecentTransactionsView.as_view(), name="recent-transactions"),
]
