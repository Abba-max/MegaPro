# Stage 1: Build the Angular application
FROM node:20-alpine AS build

WORKDIR /frontend

# Copy frontend source
COPY MegaPro1.1/Code/eyang-frontend/package*.json ./
RUN npm ci

COPY MegaPro1.1/Code/eyang-frontend/ ./
RUN npm run build -- --configuration production

# Stage 2: Python Backend
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

# Copy the application code
COPY backend/ .

# Copy the built frontend files from Stage 1
COPY --from=build /frontend/dist/eyang-frontend/browser /app/frontend_build

# Expose the internal port
EXPOSE 8000

# Start Daphne
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "project.asgi:application"]
