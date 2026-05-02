# apps/estate_app/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .api_views import (
    # Auth
    register_view, verify_email_view, me_view,

    # Viewsets
    EstateViewSet, RoomCategoryViewSet, ReviewViewSet,
    QuickOrderViewSet, ContactRequestViewSet, ConversationViewSet,
    NotificationViewSet,

    # Stats
    stats_view, owner_stats_view, client_stats_view, online_users_view,

    # Admin views
    admin_stats_view,
    admin_bookings_view,
    admin_reviews_view,
    admin_contacts_view,
    admin_users_view,
    admin_verify_owner_view,
    admin_toggle_user_view,
    admin_update_user_view,
    admin_delete_user_view,
)

# ── DRF Router (handles CRUD + custom @action endpoints automatically) ────────
router = DefaultRouter()
router.register(r'estates',          EstateViewSet,          basename='estate')
router.register(r'room-categories',  RoomCategoryViewSet,    basename='room-category')
router.register(r'reviews',          ReviewViewSet,          basename='review')
router.register(r'orders',           QuickOrderViewSet,      basename='order')
router.register(r'contact-requests', ContactRequestViewSet,  basename='contact-request')
router.register(r'conversations',    ConversationViewSet,    basename='conversation')
router.register(r'notifications',    NotificationViewSet,    basename='notification')

urlpatterns = [
    # ── Auth ──────────────────────────────────────────────────────────────
    path('api/auth/register/',  register_view,      name='register'),
    path('api/auth/verify/',    verify_email_view,  name='verify-email'),
    path('api/auth/me/',        me_view,            name='me'),

    # ── ViewSet routes (CRUD + @action extras like verify, accept, reject) ─
    path('api/', include(router.urls)),

    # ── Public stats (home page) ─────────────────────────────────────────
    path('api/stats/',          stats_view,         name='stats'),

    # ── Owner dashboard stats ─────────────────────────────────────────────
    path('api/dashboard/stats/', owner_stats_view,  name='owner-stats'),

    # ── Client dashboard stats ────────────────────────────────────────────
    path('api/client/stats/',    client_stats_view, name='client-stats'),

    # ── Online users (chat presence) ──────────────────────────────────────
    path('api/online-users/',    online_users_view, name='online-users'),

    # ── Admin endpoints ───────────────────────────────────────────────────
    path('api/admin/stats/',                       admin_stats_view,         name='admin-stats'),
    path('api/admin/bookings/',                    admin_bookings_view,      name='admin-bookings'),
    path('api/admin/reviews/',                     admin_reviews_view,       name='admin-reviews'),
    path('api/admin/contacts/',                    admin_contacts_view,      name='admin-contacts'),
    path('api/admin/users/',                       admin_users_view,         name='admin-users'),
    path('api/admin/users/<int:user_id>/verify/',  admin_verify_owner_view,  name='admin-verify-owner'),
    path('api/admin/users/<int:user_id>/toggle/',  admin_toggle_user_view,   name='admin-toggle-user'),
    path('api/admin/users/<int:user_id>/update/',  admin_update_user_view,   name='admin-update-user'),
    path('api/admin/users/<int:user_id>/delete/',  admin_delete_user_view,   name='admin-delete-user'),
]