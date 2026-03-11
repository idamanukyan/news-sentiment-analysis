# AIIM Combined Dockerfile - Backend + Frontend
# Builds both services and serves frontend from Spring Boot

# ===========================================
# Stage 1: Build Frontend
# ===========================================
FROM node:20-alpine AS frontend-builder

WORKDIR /frontend

# Install dependencies
COPY frontend/package*.json ./
RUN npm ci

# Copy source and build
COPY frontend/ .

# Build with API pointing to same origin
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ===========================================
# Stage 2: Build Backend
# ===========================================
FROM gradle:8.5-jdk21 AS backend-builder

WORKDIR /app

# Copy gradle files first for caching
COPY backend/build.gradle backend/settings.gradle ./

# Download dependencies
RUN gradle dependencies --no-daemon || true

# Copy source code
COPY backend/src ./src

# Build application
RUN gradle bootJar --no-daemon

# ===========================================
# Stage 3: Production Runtime
# ===========================================
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Create non-root user
RUN addgroup -g 1000 appgroup && \
    adduser -u 1000 -G appgroup -D appuser

# Copy jar from backend builder
COPY --from=backend-builder /app/build/libs/*.jar app.jar

# Copy frontend build to static resources
COPY --from=frontend-builder /frontend/dist ./static

# Set ownership
RUN chown -R appuser:appgroup /app

USER appuser

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/actuator/health || exit 1

# Run application
ENTRYPOINT ["java", "-Dspring.web.resources.static-locations=file:/app/static/,classpath:/static/", "-jar", "app.jar"]
