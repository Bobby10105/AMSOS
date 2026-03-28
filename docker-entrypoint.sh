#!/bin/sh
set -e

# Set a default DATABASE_URL if not provided
if [ -z "$DATABASE_URL" ]; then
  export DATABASE_URL="file:/app/prisma/dev.db"
fi

# Run Prisma db push to ensure DB schema is created
echo "Initializing database schema (Prisma 6)..."
npx prisma@6 db push --accept-data-loss

# Seed the database with initial admin user if needed
echo "Seeding database..."
npx prisma@6 db seed

# Start the application
echo "Starting AMSOS..."
exec node server.js
