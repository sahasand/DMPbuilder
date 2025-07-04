# Clinical DMP Generator Docker Image
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production image
FROM node:18-alpine

# Install runtime dependencies
RUN apk add --no-cache \
    fontconfig \
    freetype \
    ttf-liberation \
    && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S dmpuser && \
    adduser -S -u 1001 -G dmpuser dmpuser

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=builder --chown=dmpuser:dmpuser /app/dist ./dist
COPY --from=builder --chown=dmpuser:dmpuser /app/node_modules ./node_modules
COPY --from=builder --chown=dmpuser:dmpuser /app/package*.json ./

# Create necessary directories
RUN mkdir -p output logs temp && \
    chown -R dmpuser:dmpuser output logs temp

# Switch to non-root user
USER dmpuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); })"

# Start the application
CMD ["node", "dist/core/app.js"]