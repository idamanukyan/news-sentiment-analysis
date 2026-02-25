# AIIM Deployment Checklist

**Version:** 1.0.0
**Last Updated:** 2026-02-18

---

## Pre-Deployment

### Environment Configuration

- [ ] Copy `.env.production.example` to `.env.production`
- [ ] Set `DB_PASSWORD` (strong password, 20+ characters)
- [ ] Set `JWT_SECRET` (minimum 256-bit, use `openssl rand -base64 32`)
- [ ] Set `ANTHROPIC_API_KEY` for AI sentiment analysis
- [ ] Set `NEWSAPI_KEY` for global news search
- [ ] Configure `CORS_ORIGINS` for production domain
- [ ] Set `TELEGRAM_API_ID` and `TELEGRAM_API_HASH` (if using Telegram monitoring)

### SSL/TLS Setup

- [ ] Obtain SSL certificate (Let's Encrypt or commercial)
- [ ] Place certificate files in `nginx/ssl/`
- [ ] Update `nginx/nginx.conf` with certificate paths

### Infrastructure

- [ ] Server meets minimum requirements (4GB RAM, 2 vCPU, 50GB storage)
- [ ] Docker and Docker Compose installed
- [ ] Ports 80 and 443 open in firewall
- [ ] Domain DNS configured

---

## Deployment Steps

### 1. Clone and Configure

```bash
git clone <repo-url> /opt/aiim
cd /opt/aiim
cp .env.production.example .env.production
# Edit .env.production with production values
```

### 2. Build Images

```bash
docker-compose -f docker-compose.prod.yml build
```

### 3. Start Services

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### 4. Verify Deployment

```bash
# Check all services running
docker-compose -f docker-compose.prod.yml ps

# Check health endpoints
curl http://localhost:8080/actuator/health
curl http://localhost/health

# Check logs
docker-compose -f docker-compose.prod.yml logs -f
```

### 5. Initialize Demo Data (Optional)

```bash
./scripts/seed-demo.sh
```

---

## Post-Deployment Verification

### Health Checks

- [ ] `GET /actuator/health` returns `{"status":"UP"}`
- [ ] `GET /api/v1/system/health` returns application status
- [ ] Frontend loads at configured domain
- [ ] Login works with demo credentials

### Functional Tests

- [ ] Can login with `demo@aiim.am` / `AiimDemo2026`
- [ ] Dashboard displays stats and charts
- [ ] Narratives page loads and filters work
- [ ] Alerts page displays and actions work
- [ ] Sources page shows configured sources
- [ ] Reports can be generated and exported

### Security Verification

- [ ] HTTPS redirects working
- [ ] JWT tokens expire correctly (24h default)
- [ ] CORS blocking unauthorized origins
- [ ] Rate limiting active (10 req/s per IP)
- [ ] Security headers present (X-Frame-Options, etc.)

---

## Monitoring Setup

### Log Aggregation

```bash
# View all logs
docker-compose -f docker-compose.prod.yml logs -f

# View specific service
docker-compose -f docker-compose.prod.yml logs -f backend
```

### Metrics (Optional)

- [ ] Enable Prometheus endpoint in application.yml
- [ ] Configure Grafana dashboards
- [ ] Set up alerting for service health

---

## Backup Strategy

### Database Backup

```bash
# Manual backup
docker exec aiim-db pg_dump -U aiim_user aiim_production > backup_$(date +%Y%m%d).sql

# Restore from backup
cat backup_20260218.sql | docker exec -i aiim-db psql -U aiim_user aiim_production
```

### Automated Backups

- [ ] Configure daily PostgreSQL backups
- [ ] Set up backup retention policy (30 days recommended)
- [ ] Test restore procedure

---

## Rollback Procedure

### Quick Rollback

```bash
# Stop current deployment
docker-compose -f docker-compose.prod.yml down

# Restore previous version
git checkout <previous-tag>
docker-compose -f docker-compose.prod.yml up -d
```

### Database Rollback

```bash
# Only if schema changes were made
cat backup_<date>.sql | docker exec -i aiim-db psql -U aiim_user aiim_production
```

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Backend not starting | Check `DB_PASSWORD` and database connectivity |
| Frontend 502 error | Ensure backend is healthy, check nginx logs |
| Login fails | Verify JWT_SECRET is set, check backend logs |
| Slow performance | Check Redis connection, database indexes |
| Scraper not running | Verify API keys (ANTHROPIC, NEWSAPI) |

### Debug Commands

```bash
# Check container status
docker-compose -f docker-compose.prod.yml ps

# View container logs
docker logs aiim-backend --tail 100

# Enter container shell
docker exec -it aiim-backend sh

# Check database connection
docker exec aiim-db pg_isready -U aiim_user

# Check Redis
docker exec aiim-redis redis-cli ping
```

---

## Contact

- **Technical Issues:** [GitHub Issues](https://github.com/your-org/aiim/issues)
- **Security Concerns:** security@aiim.am
