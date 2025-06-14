# =============================================================================
# XMTP Prediction Bot Dockerfile
# =============================================================================
# Multi-stage build for production XMTP bot deployment

# Stage 1: Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies for building
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    curl

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Install dependencies with memory optimization
RUN npm ci --only=production --maxsockets 1 && npm cache clean --force

# Copy only necessary files for building
COPY lib/ ./lib/
COPY scripts/ ./scripts/
COPY contracts/ ./contracts/

# Skip TypeScript compilation to save memory - we'll use ts-node at runtime

# Stage 2: Production stage
FROM node:18-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache \
    dumb-init \
    curl \
    ca-certificates

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S botuser -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=botuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=botuser:nodejs /app/lib ./lib
COPY --from=builder --chown=botuser:nodejs /app/scripts ./scripts
COPY --from=builder --chown=botuser:nodejs /app/contracts ./contracts
COPY --from=builder --chown=botuser:nodejs /app/package*.json ./
COPY --from=builder --chown=botuser:nodejs /app/tsconfig*.json ./

# Install ts-node for runtime TypeScript execution
RUN npm install -g ts-node typescript

# Create data directory for XMTP storage
RUN mkdir -p /app/data && chown botuser:nodejs /app/data

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Switch to non-root user
USER botuser

# Expose port for health checks
EXPOSE 3001

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the bot service using our lightweight starter
CMD ["node", "scripts/start-bot-service.js"]
