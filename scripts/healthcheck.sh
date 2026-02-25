#!/bin/bash
# AIIM Health Check Script
# Usage: ./scripts/healthcheck.sh

set -e

cd "$(dirname "$0")/.."

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "AIIM Health Check"
echo "=========================================="
echo ""

check_service() {
    local name=$1
    local url=$2
    local expected=$3

    printf "%-20s" "$name:"

    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")

    if [ "$response" == "$expected" ]; then
        echo -e "${GREEN}OK${NC} (HTTP $response)"
        return 0
    else
        echo -e "${RED}FAILED${NC} (HTTP $response, expected $expected)"
        return 1
    fi
}

check_container() {
    local name=$1

    printf "%-20s" "$name:"

    status=$(docker inspect --format='{{.State.Health.Status}}' "$name" 2>/dev/null || echo "not found")

    case "$status" in
        healthy)
            echo -e "${GREEN}healthy${NC}"
            return 0
            ;;
        unhealthy)
            echo -e "${RED}unhealthy${NC}"
            return 1
            ;;
        starting)
            echo -e "${YELLOW}starting${NC}"
            return 1
            ;;
        *)
            echo -e "${RED}$status${NC}"
            return 1
            ;;
    esac
}

echo "Container Health:"
echo "-----------------"
check_container "newssentiment-backend" || true
check_container "newssentiment-db" || true
check_container "newssentiment-redis" || true
check_container "newssentiment-frontend" || true

echo ""
echo "Service Endpoints:"
echo "-----------------"
check_service "Backend API" "http://localhost:8080/actuator/health" "200" || true
check_service "Backend Liveness" "http://localhost:8080/actuator/health/liveness" "200" || true
check_service "Backend Readiness" "http://localhost:8080/actuator/health/readiness" "200" || true
check_service "Frontend" "http://localhost:5173" "200" || true

echo ""
echo "Database Connection:"
echo "-------------------"
printf "%-20s" "PostgreSQL:"
if docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FAILED${NC}"
fi

echo ""
echo "Resource Usage:"
echo "--------------"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" 2>/dev/null | head -6

echo ""
echo "=========================================="
echo "Health check complete"
echo "=========================================="
