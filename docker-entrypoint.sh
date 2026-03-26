#!/bin/sh
set -e

# Run Prisma db push to ensure DB schema is created
# Since we don't have migration files, we use db push to sync the schema directly
echo "Initializing database schema (Prisma 6)..."
npx prisma@6 db push --accept-data-loss

# Seed the database with initial admin user if needed
echo "Seeding database..."
npx prisma@6 db seed

# Start the application
echo "Starting AMSOS..."
exec node server.js
