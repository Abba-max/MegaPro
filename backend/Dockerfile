# ── Stage 1: Build Angular Frontend ──────────────────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /frontend

COPY MegaPro1.1/Code/eyang-frontend/package*.json ./
RUN npm ci

COPY MegaPro1.1/Code/eyang-frontend/ ./
RUN npm run build -- --configuration production

# ── Stage 2: Python base (shared by web + celery) ────────────────────────────
FROM python:3.13-slim AS python-base

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

# ── Stage 3: Web server (includes Angular build + collectstatic) ──────────────
FROM python-base AS web

RUN rm -rf frontend_build
COPY --from=frontend-builder /frontend/dist/eyang-frontend/browser ./frontend_build/

RUN DATABASE_URL="" \
    SECRET_KEY="build-time-secret-key" \
    python manage.py collectstatic --noinput

EXPOSE 8000
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "project.asgi:application"]

# ── Stage 4: Celery worker (no frontend, no collectstatic) ───────────────────
FROM python-base AS celery

CMD ["celery", "-A", "project", "worker", "--loglevel=info"]