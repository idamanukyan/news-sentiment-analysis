#!/bin/bash
# AIIM Deployment Script
# Usage: ./scripts/deploy.sh [dev|prod|status|logs|restart]

set -e

ENV=${1:-dev}
echo "=========================================="
echo "AIIM Deployment - Command: $ENV"
echo "=========================================="

cd "$(dirname "$0")/.."

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_debug() { echo -e "${BLUE}[DEBUG]${NC} $1"; }

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi

    if [ ! -f ".env" ]; then
        log_warn ".env file not found, copying from .env.example"
        cp .env.example .env
    fi

    log_info "Prerequisites OK"
}

# Deploy development
deploy_dev() {
    log_info "Starting development deployment..."

    # Stop existing containers
    docker-compose down --remove-orphans 2>/dev/null || true

    # Build and start
    docker-compose up -d --build

    # Wait for health
    log_info "Waiting for services to be healthy..."
    sleep 10

    # Check health
    if docker-compose ps | grep -q "unhealthy"; then
        log_error "Some services are unhealthy"
        docker-compose ps
        exit 1
    fi

    log_info "Development deployment complete!"
    echo ""
    echo "Services:"
    echo "  - Frontend: http://localhost:5173"
    echo "  - Backend:  http://localhost:8080"
    echo "  - Database: localhost:5432"
    echo ""
}

# Deploy production
deploy_prod() {
    log_info "Starting production deployment..."

    if [ ! -f ".env.prod" ]; then
        log_error ".env.prod file not found"
        exit 1
    fi

    docker-compose -f docker-compose.prod.yml down --remove-orphans 2>/dev/null || true
    docker-compose -f docker-compose.prod.yml up -d --build

    log_info "Production deployment complete!"
}

# Run migrations
run_migrations() {
    log_info "Running database migrations..."
    docker-compose exec -T backend java -jar app.jar --spring.flyway.enabled=true || true
    log_info "Migrations complete"
}

# Show status
show_status() {
    log_info "Service Status:"
    docker-compose ps
    echo ""
    log_info "Health Checks:"
    curl -s http://localhost:8080/actuator/health 2>/dev/null | python3 -m json.tool || echo "Backend not reachable"
    echo ""
}

# Show logs
show_logs() {
    SERVICE=${2:-}
    if [ -n "$SERVICE" ]; then
        docker-compose logs -f --tail=100 "$SERVICE"
    else
        docker-compose logs -f --tail=100
    fi
}

# Restart services
restart_services() {
    SERVICE=${2:-}
    if [ -n "$SERVICE" ]; then
        log_info "Restarting $SERVICE..."
        docker-compose restart "$SERVICE"
    else
        log_info "Restarting all services..."
        docker-compose restart
    fi
}

# Backup database
backup_db() {
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="backups/aiim_backup_${TIMESTAMP}.sql"
    mkdir -p backups
    log_info "Creating database backup: $BACKUP_FILE"
    docker-compose exec -T postgres pg_dump -U postgres newssentiment > "$BACKUP_FILE"
    log_info "Backup created: $BACKUP_FILE"
}

# Show help
show_help() {
    echo "Usage: ./scripts/deploy.sh [command]"
    echo ""
    echo "Commands:"
    echo "  dev      - Deploy development environment (default)"
    echo "  prod     - Deploy production environment"
    echo "  status   - Show service status"
    echo "  logs     - Show service logs (optionally: logs [service])"
    echo "  restart  - Restart services (optionally: restart [service])"
    echo "  backup   - Create database backup"
    echo "  help     - Show this help"
    echo ""
}

# Main
case "$ENV" in
    prod)
        check_prerequisites
        deploy_prod
        ;;
    dev)
        check_prerequisites
        deploy_dev
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs "$@"
        ;;
    restart)
        restart_services "$@"
        ;;
    backup)
        backup_db
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        check_prerequisites
        deploy_dev
        ;;
esac

log_info "Done!"
