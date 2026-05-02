# Stage 1: Build Angular Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /frontend

# Copy frontend source
COPY MegaPro1.1/Code/eyang-frontend/package*.json ./
RUN npm ci

COPY MegaPro1.1/Code/eyang-frontend/ ./
RUN npm run build -- --configuration production

# Stage 2: Django Backend
FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend code
COPY backend/ .

# Copy the freshly built Angular files from Stage 1 into the frontend_build directory.
# This ensures Django and WhiteNoise always serve the absolute latest frontend code.
RUN rm -rf frontend_build
COPY --from=frontend-builder /frontend/dist/eyang-frontend/browser ./frontend_build/

# Collect static files for production (includes Django admin + Angular build)
RUN python manage.py collectstatic --noinput

# Expose the internal port
EXPOSE 8000

# Start Daphne
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "project.asgi:application"]
