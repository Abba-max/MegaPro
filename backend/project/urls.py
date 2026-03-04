# project/urls.py
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenRefreshView
from apps.estate_app.api_views import MyTokenObtainPairView

urlpatterns = [
    path('admin/', admin.site.urls),

    # ── App routes (API + auth/register, auth/me) ───────────────
    path('', include('apps.estate_app.urls')),

    # ── JWT ─────────────────────────────────────────────────────
    # MyTokenObtainPairView injecte role/name/initials dans le token
    path('api/token/',         MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(),      name='token_refresh'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL,  document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)