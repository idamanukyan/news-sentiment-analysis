#!/bin/bash
# AIIM Demo Reset Script
# Resets the demo environment to a clean state for presentations

set -e

cd "$(dirname "$0")/.."

echo "=========================================="
echo "AIIM Demo Reset"
echo "=========================================="

# Confirm reset
read -p "This will reset ALL demo data. Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

# Reset database
echo "[INFO] Resetting database..."
docker-compose down -v 2>/dev/null || true
docker-compose up -d postgres redis
sleep 5

# Restart services
echo "[INFO] Restarting services..."
docker-compose up -d --build

# Wait for health
echo "[INFO] Waiting for services..."
sleep 15

# Seed demo data
echo "[INFO] Seeding demo data..."
./scripts/seed-demo.sh

echo ""
echo "=========================================="
echo "Demo reset complete!"
echo "=========================================="
echo ""
echo "Login credentials:"
echo "  Email: admin@aiim.am"
echo "  Password: demo2025"
echo ""
