"""Payment URL patterns."""
from django.urls import path
from .views import CreateOrderView, WebhookView

urlpatterns = [
    path("create-order", CreateOrderView.as_view()),
    path("webhook",      WebhookView.as_view()),
]
