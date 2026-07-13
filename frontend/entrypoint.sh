#!/bin/sh
set -e

echo "Starting Frontend Application..."

# Determine package manager
if command -v bun >/dev/null 2>&1; then
    PKG_MANAGER="bun"
    echo "Using bun as package manager"
else
    PKG_MANAGER="npm"
    echo "Using npm as package manager"
fi

if [ "$NODE_ENV" = "development" ]; then
    echo "Running in development mode..."
    if [ "$PKG_MANAGER" = "bun" ]; then
        exec bun run dev --host 0.0.0.0 --port 3000
    else
        exec npm run dev -- --host 0.0.0.0 --port 3000
    fi
else
    # Serve the bundle ALREADY built at image-build time (Dockerfile `RUN ... build`).
    # Do NOT rebuild at container startup: rebuilding took minutes and the ALB health
    # check killed the task (exit 137) before it ever served on :3000, crash-looping
    # the ECS service (ServicesStable timeout). Serving the prebuilt dist/ is healthy
    # within seconds.
    echo "Starting production server (serving prebuilt dist)..."
    if [ "$PKG_MANAGER" = "bun" ]; then
        exec bun run preview --host 0.0.0.0 --port 3000
    else
        exec npm run preview -- --host 0.0.0.0 --port 3000
    fi
fi
