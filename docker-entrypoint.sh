#!/bin/sh
set -e

# Run Prisma migrations to ensure DB schema is up to date
# We pin to prisma@6 to match the project's version and avoid Prisma 7's breaking changes
echo "Running database migrations (Prisma 6)..."
npx prisma@6 migrate deploy

# Start the application
echo "Starting AMSOS..."
exec node server.js
