# ===================================
# Stage 1: Builder
# ===================================
FROM python:3.13-alpine AS builder

# Set working directory
WORKDIR /build

# Install build dependencies
RUN apk add --no-cache \
    gcc \
    musl-dev \
    libffi-dev \
    openssl-dev

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies
# Use --no-cache-dir to reduce image size
# Exclude development dependencies in production
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    # Remove development dependencies for production
    pip uninstall -y pytest pytest-asyncio pytest-cov black flake8 mypy

# ===================================
# Stage 2: Production
# ===================================
FROM python:3.13-alpine

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8001

# Set working directory
WORKDIR /app

# Install runtime dependencies only
RUN apk add --no-cache libffi openssl

# Create non-root user for security
RUN addgroup -g 1000 appuser && \
    adduser -D -u 1000 -G appuser appuser

# Copy Python packages from builder
COPY --from=builder /usr/local/lib/python3.13/site-packages /usr/local/lib/python3.13/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY --chown=appuser:appuser app/ /app/app/
COPY --chown=appuser:appuser .env.example /app/.env.example

# Create directories for logs and temp files
RUN mkdir -p /app/logs /app/tmp && \
    chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8001/health', timeout=5)" || exit 1

# Run application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "1"]
