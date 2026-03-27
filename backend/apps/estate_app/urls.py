from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .api_views import (
    EstateViewSet, ReviewViewSet, QuickOrderViewSet,
    ContactRequestViewSet, ConversationViewSet, RoomCategoryViewSet,
    MyTokenObtainPairView,
    register_view, me_view, stats_view,
    owner_stats_view, client_stats_view,
    admin_stats_view, online_users_view,
    admin_bookings_view, admin_reviews_view,
    admin_contacts_view, admin_users_view,
    admin_toggle_user_view, admin_verify_owner_view, admin_update_user_view, admin_delete_user_view,
)

router = DefaultRouter()
router.register(r'estates',          EstateViewSet)
router.register(r'reviews',          ReviewViewSet)
router.register(r'orders',           QuickOrderViewSet)
router.register(r'contact-requests', ContactRequestViewSet)
router.register(r'conversations',    ConversationViewSet, basename='conversation')
router.register(r'room-categories', RoomCategoryViewSet)

urlpatterns = [
    path('api/', include(router.urls)),

    # ── Auth ──────────────────────────────────────────────────
    path('api/auth/register/', register_view,                   name='register'),
    path('api/auth/me/',       me_view,                         name='me'),
    path('api/online-users/',  online_users_view,               name='online-users'),

    # ── Public stats ──────────────────────────────────────────
    path('api/stats/',         stats_view,        name='stats'),

    # ── Owner dashboard ───────────────────────────────────────
    path('api/dashboard/stats/', owner_stats_view, name='owner-stats'),

    # ── Client dashboard ──────────────────────────────────────
    path('api/client/stats/',    client_stats_view, name='client-stats'),

    # ── Admin ─────────────────────────────────────────────────
    path('api/admin/stats/',    admin_stats_view,       name='admin-stats'),
    path('api/admin/bookings/', admin_bookings_view,    name='admin-bookings'),
    path('api/admin/reviews/',  admin_reviews_view,     name='admin-reviews'),
    path('api/admin/contacts/', admin_contacts_view,    name='admin-contacts'),
    path('api/admin/users/',    admin_users_view,        name='admin-users'),
    path('api/admin/users/<int:user_id>/toggle/', admin_toggle_user_view, name='admin-toggle-user'),
    path('api/admin/users/<int:user_id>/verify/', admin_verify_owner_view, name='admin-verify-owner'), # New verification endpoint
    path('api/admin/users/<int:user_id>/update/', admin_update_user_view, name='admin-update-user'),
    path('api/admin/users/<int:user_id>/delete/', admin_delete_user_view, name='admin-delete-user'),
]