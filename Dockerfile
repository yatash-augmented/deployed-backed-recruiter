FROM node:18-alpine

# Install system dependencies including FFmpeg for video processing
RUN apk add --no-cache \
    python3 \
    py3-pip \
    build-base \
    python3-dev \
    libffi-dev \
    openssl-dev \
    curl \
    ffmpeg \
    linux-headers \
    aws-cli \
    && ln -sf python3 /usr/bin/python

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production

# Install Python dependencies
RUN pip3 install --no-cache-dir --break-system-packages \
    requests \
    numpy

# Copy application code
COPY . .

# Create necessary directories for file uploads (will use S3 in production)
RUN mkdir -p public/uploads public/compressed .well-known && \
    chmod -R 755 public .well-known

# Set environment variables for production
ENV NODE_ENV=production
ENV PORT=3000

# Expose port (original port)
EXPOSE 3000

# Health check for ECS monitoring
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

# Start the application
CMD ["node", "bin/www"]
