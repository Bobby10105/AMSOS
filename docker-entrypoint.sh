#!/bin/sh
set -e

# Run Prisma migrations to ensure DB schema is up to date
# In production, we use 'prisma migrate deploy' to avoid interactive prompts
echo "Running database migrations..."
npx prisma migrate deploy

# Start the application
echo "Starting AMSOS..."
exec node server.js
