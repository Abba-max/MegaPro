from django.urls import path
from . import views
from django.conf import settings
from django.contrib.auth import views as auth_views
from django.conf.urls.static import static

urlpatterns = [
    path('', views.index, name='index'),
    path('registration/', views.registration, name='registration'),
    path('login/', views.login, name='login'),
    path('logout', views.logout, name='logout'),
    path('post/<str:pk>', views.post, name='post'), 
    path('rpost/<str:pk>', views.rpost, name='rpost'),
    path('contact/', views.contact_view, name='contact'),
    path('review/', views.review_view, name='review'),
    path('quick_order/', views.quick_order_view, name='quick_order'),
    path('password_reset/', 
         auth_views.PasswordResetView.as_view(), 
         name='password_reset'),#password reset urls
    path('password_reset/done/', 
         auth_views.PasswordResetDoneView.as_view(), 
         name='password_reset_done'),#password reset urls
    path('reset/<uidb64>/<token>/', 
         auth_views.PasswordResetConfirmView.as_view(), 
         name='password_reset_confirm'),#password reset urls
    path('reset/done/', 
         auth_views.PasswordResetCompleteView.as_view(), 
         name='password_reset_complete'), #password reset urls
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT) 