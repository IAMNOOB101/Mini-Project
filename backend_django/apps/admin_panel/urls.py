"""Admin panel URL patterns."""
from django.urls import path
from .views import (
    StatsView, DomainStatsView,
    UserListView, UserRoleView, UserDeleteView,
    InstitutionView, InstitutionStatusView,
)

urlpatterns = [
    path("stats",                                     StatsView.as_view()),
    path("domain-stats",                              DomainStatsView.as_view()),
    path("users",                                     UserListView.as_view()),
    path("users/<int:user_id>/role",                  UserRoleView.as_view()),
    path("users/<int:user_id>",                       UserDeleteView.as_view()),
    path("institutions",                              InstitutionView.as_view()),
    path("institutions/<int:institution_id>/status",  InstitutionStatusView.as_view()),
]
