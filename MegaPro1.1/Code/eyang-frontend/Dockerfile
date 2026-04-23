# Stage 1: Build the Angular application
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build -- --configuration production

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled files from the build stage
COPY --from=build /app/dist/eyang-frontend/browser /usr/share/nginx/html

# Expose port 80 (internal to Docker network)
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
