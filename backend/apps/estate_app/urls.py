# apps/estate_app/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api_views import (
    EstateViewSet, ReviewViewSet,
    QuickOrderViewSet, ContactRequestViewSet,
    register_view, me_view,stats_view
)

router = DefaultRouter()
router.register(r'estates',          EstateViewSet)
router.register(r'reviews',          ReviewViewSet)
router.register(r'orders',           QuickOrderViewSet)
router.register(r'contact-requests', ContactRequestViewSet)

urlpatterns = [
    path('api/', include(router.urls)),

    # ── Auth endpoints ──────────────────────────────────────────
    path('api/auth/register/', register_view, name='register'),
    path('api/auth/me/',       me_view,       name='me'),
    path('api/stats/',         stats_view,    name='stats'),
]