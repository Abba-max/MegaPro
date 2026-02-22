from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api_views import EstateViewSet, ReviewViewSet, QuickOrderViewSet

router = DefaultRouter()
router.register(r'estates', EstateViewSet)
router.register(r'reviews', ReviewViewSet)
router.register(r'orders', QuickOrderViewSet)

urlpatterns = [
    # API endpoints
    path('api/', include(router.urls)),
]