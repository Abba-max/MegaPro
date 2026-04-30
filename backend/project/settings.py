# project/settings.py
from pathlib import Path
import os
import dj_database_url
from decouple import config
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config('SECRET_KEY', default='django-insecure-jt#l8zbav+z+1ens!08-6r#ko9f)%jlykv8nt@w9#kfebf5q$o')
DEBUG      = config('DEBUG', default=True, cast=bool)

ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='127.0.0.1,eyang-estate.onrender.com,localhost,').split(',')

CSRF_TRUSTED_ORIGINS = config('CSRF_TRUSTED_ORIGINS', default='https://eyang-estate.onrender.com,http://127.0.0.1:8000,http://localhost:8000').split(',')

INSTALLED_APPS = [
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'apps.estate_app',
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'channels',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
ROOT_URLCONF        = 'project.urls'
WSGI_APPLICATION    = 'project.wsgi.application'
ASGI_APPLICATION    = 'project.asgi.application'

# ── Channels ───────────────────────────────────────────────────────────────
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer',
    },
}

TEMPLATES = [{
    'BACKEND': 'django.template.backends.django.DjangoTemplates',
    'DIRS': [os.path.join(BASE_DIR, 'frontend_build')],
    'APP_DIRS': True,
    'OPTIONS': {'context_processors': [
        'django.template.context_processors.debug',
        'django.template.context_processors.request',
        'django.contrib.auth.context_processors.auth',
        'django.contrib.messages.context_processors.messages',
    ]},
}]

DATABASES = {
    'default': {
        'ENGINE':   'django.db.backends.postgresql',
        'NAME':     config('DB_NAME', default='eyang'),
        'USER':     config('DB_USER', default='prisma'),
        'PASSWORD': config('DB_PASSWORD', default='***'),
        'HOST':     config('DB_HOST', default='db'),
        'PORT':     config('DB_PORT', default='5432'),
    }
}

database_url = config('DATABASE_URL', default=None)
if database_url:
    database_url = database_url.replace('postgres://', 'postgresql://', 1)
    db_config = dj_database_url.parse(database_url)
    if db_config.get('ENGINE') == 'django.db.backends.postgresql':
        if config('REQUIRE_DB_SSL', default=False, cast=bool):
            db_config.setdefault('OPTIONS', {})['sslmode'] = 'require'
    DATABASES['default'] = db_config


AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]
LOGIN_URL       = '/login/'
AUTH_USER_MODEL = 'estate_app.User'

LANGUAGE_CODE = 'fr-fr'
TIME_ZONE     = 'Africa/Douala'
USE_I18N      = True
USE_TZ        = True

# ── Static & Media ─────────────────────────────────────────────────────────
STATIC_URL  = '/static/'
MEDIA_URL   = '/media/'

# Static files collected by collectstatic (whitenoise serves these in prod)
STATICFILES_DIRS = [os.path.join(BASE_DIR, 'frontend_build')]
STATIC_ROOT = os.path.join(BASE_DIR, 'static_cdn', 'static_root')

# Serve files from the frontend_build directory directly at the root URL (/, /styles.css, etc.)
WHITENOISE_ROOT = os.path.join(BASE_DIR, 'frontend_build')


# ── FIX: use the standard BASE_DIR/media/ directory for uploaded files.
#    The old value ('static_cdn/media_root') didn't match where Django
#    actually writes uploaded files, causing every image to 404.
#
#    If you had files in static_cdn/media_root/, move them:
#      Windows: xcopy /E /I backend\static_cdn\media_root backend\media
#      macOS/Linux: cp -r backend/static_cdn/media_root/. backend/media/
# ────────────────────────────────────────────────────────────────────────────
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
EMAIL_BACKEND      = 'django.core.mail.backends.console.EmailBackend'

# ── DRF ────────────────────────────────────────────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
}

# ── SimpleJWT ──────────────────────────────────────────────────────────────
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME':    timedelta(days=7),
    'REFRESH_TOKEN_LIFETIME':   timedelta(days=7),
    'ROTATE_REFRESH_TOKENS':    False,
    'BLACKLIST_AFTER_ROTATION': False,
    'AUTH_HEADER_TYPES':        ('Bearer',),
    'TOKEN_OBTAIN_SERIALIZER':  'apps.estate_app.serializers.MyTokenObtainPairSerializer',
}

# ── CORS ───────────────────────────────────────────────────────────────────
CORS_ALLOWED_ORIGINS = [
    "http://localhost:4200",
    "http://127.0.0.1:4200",
]
CORS_ALLOW_CREDENTIALS = True