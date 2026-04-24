# Stage 1: Build the Angular application
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build -- --configuration production

# Stage 2: Serve application
FROM caddy:alpine

# Copy custom Caddy configuration
COPY Caddyfile /etc/caddy/Caddyfile

# Copy compiled files from the build stage
COPY --from=build /app/dist/eyang-frontend/browser /srv

# Expose port 80 (internal to Docker network)
EXPOSE 80
