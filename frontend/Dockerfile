# Use Node.js 24 Alpine as base image
FROM node:24-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache curl unzip

# Try to install bun, fallback to npm if it fails
RUN curl -fsSL https://bun.sh/install | bash || echo "Bun installation failed, will use npm" \
    && if [ -f /root/.bun/bin/bun ]; then \
        mv /root/.bun/bin/bun /usr/local/bin/bun && chmod +x /usr/local/bin/bun; \
    fi

# Copy package files
COPY package.json bun.lockb* package-lock.json* ./

# Set environment variable to skip husky during Docker build
ENV HUSKY=0

# Install dependencies - try bun first, fallback to npm
RUN if command -v bun >/dev/null 2>&1; then \
        echo "Using bun for installation..." && bun install; \
    else \
        echo "Using npm for installation..." && npm install; \
    fi

# Copy source code
COPY . .

# Build the application for production (this ensures build works before deployment)
RUN if command -v bun >/dev/null 2>&1; then \
        echo "Building with bun..." && bun run build; \
    else \
        echo "Building with npm..." && npm run build; \
    fi

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Change ownership of the app directory
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 3000

# Copy entrypoint script
COPY --chown=nextjs:nodejs entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Set entrypoint
ENTRYPOINT ["/entrypoint.sh"]
