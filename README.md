# AIIM - Armenia Information Integrity Monitor

A comprehensive election monitoring and disinformation detection platform for Armenia 2026 elections. Tracks narratives, analyzes sentiment, and provides real-time threat alerts across Armenian, Russian, and English media sources.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Architecture                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Frontend   │───▶│   Backend    │───▶│  PostgreSQL  │      │
│  │   (React)    │    │ (Spring Boot)│    │              │      │
│  │   :3000      │    │   :8080      │    │   :5432      │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                             │                    ▲              │
│                             ▼                    │              │
│                      ┌──────────────┐            │              │
│                      │    Redis     │            │              │
│                      │   :6379      │            │              │
│                      └──────────────┘            │              │
│                                                  │              │
│  ┌──────────────┐                               │              │
│  │   Scraper    │───────────────────────────────┘              │
│  │   (Python)   │                                              │
│  └──────────────┘                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Key Features

- **Election Dashboard**: Real-time monitoring of election-related narratives and threats
- **Narrative Tracking**: Detect and track disinformation campaigns with keyword matching
- **Threat Alerts**: Automated alerts for volume spikes, coordinated attacks, and viral content
- **Sentiment Analysis**: AI-powered sentiment analysis using Claude API
- **Multi-source Ingestion**: RSS feeds, Telegram channels, and web scraping
- **Role-Based Access**: VIEWER, ANALYST, and ADMIN roles with granular permissions
- **Multilingual Support**: Armenian, Russian, and English content analysis

## Demo Accounts

| Email | Password | Role | Permissions |
|-------|----------|------|-------------|
| `demo@aiim.am` | `AiimDemo2026` | ADMIN | Full access to all features |
| `analyst@aiim.am` | `testpass123` | ANALYST | Create/edit narratives, manage alerts |
| `viewer@aiim.am` | `testpass123` | VIEWER | Read-only dashboard access |

**For demo presentations, use:** `demo@aiim.am` / `AiimDemo2026`

## Tech Stack

- **Backend**: Java 21, Spring Boot 3.2, PostgreSQL 16, Redis
- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, Recharts
- **Scraper**: Python 3.12, feedparser, BeautifulSoup, Anthropic API
- **Infrastructure**: Docker, GitHub Actions, Nginx

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Java 21 (for local backend development)
- Node.js 20 (for local frontend development)
- Python 3.12 (for local scraper development)

### Run with Docker (Recommended)

```bash
# Clone the repository
git clone <repo-url>
cd news-analysis

# Copy environment file
cp .env.example .env

# Edit .env and add your Anthropic API key
# ANTHROPIC_API_KEY=your-key-here

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8080
# API Docs: http://localhost:8080/swagger-ui.html
```

### Local Development Setup

#### Backend

```bash
cd backend

# Run with Gradle
./gradlew bootRun

# Or build and run JAR
./gradlew bootJar
java -jar build/libs/news-sentiment-api.jar
```

#### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

#### Scraper

```bash
cd scraper

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Run scraper
python -m src.main
```

## Project Structure

```
news-analysis/
├── backend/                 # Spring Boot API
│   ├── src/main/java/
│   │   └── com/newssentiment/
│   │       ├── config/      # Configuration classes
│   │       ├── controller/  # REST controllers
│   │       ├── dto/         # Data transfer objects
│   │       ├── model/       # JPA entities
│   │       ├── repository/  # Data repositories
│   │       ├── security/    # JWT & auth
│   │       └── service/     # Business logic
│   └── src/main/resources/
│       ├── db/migration/    # Flyway migrations
│       └── application.yml  # Configuration
│
├── frontend/                # React application
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── contexts/        # State management
│   │   ├── pages/           # Page components
│   │   ├── services/        # API clients
│   │   └── types/           # TypeScript types
│   └── index.html
│
├── scraper/                 # Python scraper service
│   ├── src/
│   │   ├── sources/         # RSS & web scrapers
│   │   ├── sentiment/       # AI analysis
│   │   └── main.py          # Entry point
│   └── requirements.txt
│
├── docs/                    # Documentation
├── infrastructure/          # Terraform, scripts
├── .github/workflows/       # CI/CD pipelines
├── docker-compose.yml       # Development
└── docker-compose.prod.yml  # Production
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login and get JWT token

### Articles
- `GET /api/v1/articles` - List articles with filters (sentiment, source, date range, search)
- `GET /api/v1/articles/{id}` - Get article by ID

### Narratives (Requires ANALYST/ADMIN role for mutations)
- `GET /api/v1/narratives` - List all narratives with pagination
- `GET /api/v1/narratives/active` - List active narratives
- `GET /api/v1/narratives/{id}` - Get narrative details
- `POST /api/v1/narratives` - Create new narrative
- `PUT /api/v1/narratives/{id}/status` - Update narrative status
- `PUT /api/v1/narratives/{id}/threat-level` - Update threat level
- `DELETE /api/v1/narratives/{id}` - Delete narrative (ADMIN only)

### Threat Alerts (Requires ANALYST/ADMIN role for mutations)
- `GET /api/v1/alerts` - List alerts with filters
- `GET /api/v1/alerts/active` - List active alerts
- `GET /api/v1/alerts/{id}` - Get alert details
- `PUT /api/v1/alerts/{id}/acknowledge` - Acknowledge alert
- `PUT /api/v1/alerts/{id}/resolve` - Resolve alert
- `PUT /api/v1/alerts/{id}/dismiss` - Dismiss alert

### Sources (Requires ADMIN role for mutations)
- `GET /api/v1/sources` - List news sources
- `GET /api/v1/sources/overview` - Get source statistics
- `POST /api/v1/sources` - Add new source
- `PUT /api/v1/sources/{id}` - Update source
- `DELETE /api/v1/sources/{id}` - Delete source

### Dashboard
- `GET /api/v1/dashboard/election` - Election monitoring dashboard data
- `GET /api/v1/dashboard/stats` - Overall statistics

### Sentiment
- `GET /api/v1/sentiment/aggregate` - Aggregated sentiment by day/source
- `GET /api/v1/sentiment/summary` - Overall sentiment counts

### System Health
- `GET /api/v1/system/health` - Application health status
- `GET /api/v1/system/status` - Detailed system status
- `GET /actuator/health` - Spring Actuator health endpoint

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | PostgreSQL host | localhost |
| `DB_PORT` | PostgreSQL port | 5432 |
| `DB_NAME` | Database name | newssentiment |
| `DB_USER` | Database user | postgres |
| `DB_PASSWORD` | Database password | postgres |
| `REDIS_HOST` | Redis host | localhost |
| `REDIS_PORT` | Redis port | 6379 |
| `JWT_SECRET` | JWT signing secret | (required) |
| `ANTHROPIC_API_KEY` | Anthropic API key | (required for scraper) |
| `CORS_ORIGINS` | Allowed CORS origins | http://localhost:3000 |

## Development

### Database Migrations

Migrations are managed with Flyway. Add new migrations to:
```
backend/src/main/resources/db/migration/V{version}__{description}.sql
```

### Adding New Sources

1. Add source configuration to `V2__seed_sources.sql`
2. For web scraping, implement scraper in `scraper/src/sources/`

### Running Tests

```bash
# Backend tests
cd backend && ./gradlew test

# Frontend tests
cd frontend && npm run test

# Scraper tests
cd scraper && pytest tests/
```

## Deployment

### Production Deployment

1. **Configure environment:**
```bash
cp .env.production.example .env.production
# Edit .env.production with production values
```

2. **Deploy with Docker Compose:**
```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Initialize database (first time only)
docker-compose exec postgres psql -U postgres -f /docker-entrypoint-initdb.d/init.sql
```

3. **Verify deployment:**
```bash
# Check health
curl http://localhost/actuator/health

# Check frontend
curl http://localhost/
```

### Production Configuration

| Component | Configuration |
|-----------|--------------|
| **Nginx** | SSL termination, rate limiting (10 req/s), gzip compression |
| **Backend** | Connection pooling (10-50 connections), request compression |
| **Database** | Optimized indexes, connection limits |
| **Redis** | Session caching, rate limit storage |

### CI/CD Pipeline

The GitHub Actions pipeline (`.github/workflows/ci.yml`) includes:

| Stage | Description |
|-------|-------------|
| `backend-test` | JUnit tests with PostgreSQL |
| `frontend-test` | Vitest tests with coverage |
| `backend-build` | Build JAR artifact |
| `frontend-build` | Build production bundle |
| `docker-build` | Build Docker images (main branch) |
| `security-scan` | Trivy vulnerability scanning |

**Create a release:**
```bash
git tag v1.0.0
git push origin v1.0.0
```

## Monitoring

### Health Endpoints

- `/actuator/health` - Overall health status
- `/actuator/health/liveness` - Kubernetes liveness probe
- `/actuator/health/readiness` - Kubernetes readiness probe
- `/api/v1/system/status` - Detailed system status

### Logging

Logs are written to stdout in JSON format for production. Configure log aggregation with:

```yaml
# docker-compose.prod.yml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

### Metrics

Spring Actuator exposes Prometheus metrics at `/actuator/prometheus` (when enabled).

## Security

### Authentication

- JWT tokens with 24-hour expiration
- Passwords hashed with BCrypt
- Role-based access control (RBAC)

### API Security

- Rate limiting: 10 requests/second per IP
- CORS configured for allowed origins
- Security headers (X-Frame-Options, X-Content-Type-Options, etc.)
- Input validation on all endpoints

### Production Checklist

- [ ] Change default JWT secret
- [ ] Set strong database passwords
- [ ] Enable SSL/TLS
- [ ] Configure firewall rules
- [ ] Set up log aggregation
- [ ] Configure backup strategy
- [ ] Enable monitoring alerts

## License

Proprietary - All rights reserved
