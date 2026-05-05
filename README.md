# AIIM - Armenia Information Integrity Monitor

A comprehensive election monitoring and disinformation detection platform for Armenia 2026 elections. Tracks narratives, analyzes sentiment, detects coordinated campaigns, and provides real-time threat alerts across Armenian, Russian, and English media sources.

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
│         ▲                    │                    ▲              │
│         │ WebSocket          ▼                    │              │
│         │ (/ws)       ┌──────────────┐            │              │
│         └─────────────│    Redis     │            │              │
│                       │   :6379      │            │              │
│                       └──────────────┘            │              │
│                                                   │              │
│  ┌──────────────┐                                │              │
│  │   Scraper    │────────────────────────────────┘              │
│  │   (Python)   │                                               │
│  └──────────────┘                                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Key Features

- **Election Dashboard**: Real-time monitoring of election-related narratives and threats
- **Narrative Tracking**: Detect and track disinformation campaigns with keyword matching and AI relevance scoring
- **Narrative Approval Workflow**: Two-step creation (pending → approved) with auto-generated narrative candidates
- **Coordination Detection**: Identify coordinated disinformation campaigns across sources
- **Threat Alerts**: Automated alerts with custom alert rules, bulk operations, and assignment workflow
- **Sentiment Analysis**: AI-powered sentiment analysis using Claude API
- **Multi-source Ingestion**: RSS feeds, Telegram channels, Facebook (with website fallbacks), and web scraping
- **Real-time Updates**: WebSocket notifications for alerts, articles, and system health
- **Multi-Organization**: Full multi-tenant architecture with organization-scoped access
- **Role-Based Access**: VIEWER, ANALYST, and ADMIN roles with Super Admin panel
- **Team Management**: Add/remove team members, manage roles and user slots
- **Custom Topics**: User-created topics with multi-language keyword tracking
- **Fact-Checking**: Link external fact-checks to narratives
- **Narrative Sharing**: Share narratives with team members with granular permissions
- **Bookmarks**: Save and organize articles for later reference
- **Discussion Threads**: Team discussions with mentions and pinning
- **Reports & Export**: Weekly, daily, incident, and EU DSA compliance reports in PDF, Excel, CSV, Markdown
- **Global Search**: Search across articles, narratives, and alerts
- **Multilingual UI**: Armenian and English interface with content analysis in Armenian, Russian, and English
- **Onboarding Tour**: Interactive guide for new users
- **Keyboard Shortcuts**: Power-user keyboard navigation

## Demo Accounts

| Email | Password | Role | Permissions |
|-------|----------|------|-------------|
| `demo@aiim.am` | `AiimDemo2026` | ADMIN | Full access to all features |
| `analyst@aiim.am` | `testpass123` | ANALYST | Create/edit narratives, manage alerts |
| `viewer@aiim.am` | `testpass123` | VIEWER | Read-only dashboard access |

**For demo presentations, use:** `demo@aiim.am` / `AiimDemo2026`

## Tech Stack

- **Backend**: Java 21, Spring Boot 3.2, PostgreSQL 16, Redis, WebSocket (SockJS/STOMP)
- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, Recharts, i18next
- **Scraper**: Python 3.12, feedparser, BeautifulSoup, Anthropic API
- **Infrastructure**: Docker, GitHub Actions, Nginx, Render, Terraform

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
│   │       ├── config/      # Configuration & WebSocket
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
│   ├── public/locales/      # i18n translations (en, hy)
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
├── infrastructure/          # Terraform, Docker scripts
├── nginx/                   # Nginx reverse proxy config
├── .github/workflows/       # CI/CD pipelines
├── docker-compose.yml       # Development
├── docker-compose.prod.yml  # Production
└── render.yaml              # Render platform deployment
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login and get JWT token

### Articles
- `GET /api/v1/articles` - List articles with filters (sentiment, source, date range, search)
- `GET /api/v1/articles/{id}` - Get article by ID

### Narratives (ANALYST/ADMIN)
- `GET /api/v1/narratives` - List all narratives with pagination
- `GET /api/v1/narratives/active` - List active narratives
- `GET /api/v1/narratives/pending` - Get narratives awaiting review
- `GET /api/v1/narratives/pending-count` - Count pending narratives
- `GET /api/v1/narratives/{id}` - Get narrative details
- `POST /api/v1/narratives` - Create new narrative
- `PUT /api/v1/narratives/{id}` - Update narrative
- `PATCH /api/v1/narratives/{id}/approve` - Approve pending narrative
- `PUT /api/v1/narratives/{id}/status` - Update narrative status
- `PUT /api/v1/narratives/{id}/threat-level` - Update threat level
- `POST /api/v1/narratives/{id}/share` - Share narrative with user
- `DELETE /api/v1/narratives/{id}/share/{userId}` - Remove sharing
- `GET /api/v1/narratives/{id}/shares` - List shares
- `DELETE /api/v1/narratives/{id}` - Delete narrative (ADMIN only)

### Fact-Checks
- `GET /api/v1/narratives/{narrativeId}/fact-checks` - Get fact-checks for narrative
- `POST /api/v1/narratives/{narrativeId}/fact-checks` - Add fact-check
- `DELETE /api/v1/fact-checks/{id}` - Delete fact-check

### Coordination Events
- `GET /api/v1/coordination-events` - List coordination events
- `GET /api/v1/coordination-events/active` - Active events
- `GET /api/v1/coordination-events/recent` - Recent events
- `GET /api/v1/coordination-events/stats` - Event statistics
- `POST /api/v1/coordination-events/{id}/review` - Mark as reviewed
- `POST /api/v1/coordination-events/{id}/dismiss` - Dismiss event

### Threat Alerts (ANALYST/ADMIN)
- `GET /api/v1/alerts` - List alerts with filters
- `GET /api/v1/alerts/active` - Active alerts
- `GET /api/v1/alerts/urgent` - Urgent alerts
- `GET /api/v1/alerts/unassigned` - Unassigned alerts
- `PUT /api/v1/alerts/{id}/acknowledge` - Acknowledge alert
- `PUT /api/v1/alerts/{id}/resolve` - Resolve alert
- `PUT /api/v1/alerts/{id}/dismiss` - Dismiss alert
- `POST /api/v1/alerts/{id}/assign` - Assign alert to user
- `PUT /api/v1/alerts/{id}/notes` - Update alert notes
- `POST /api/v1/alerts/bulk-acknowledge` - Bulk acknowledge
- `POST /api/v1/alerts/bulk-resolve` - Bulk resolve
- `POST /api/v1/alerts/bulk-dismiss` - Bulk dismiss

### Alert Rules (ANALYST/ADMIN)
- `GET /api/v1/alert-rules` - List alert rules
- `GET /api/v1/alert-rules/mine` - User's alert rules
- `POST /api/v1/alert-rules` - Create alert rule
- `PUT /api/v1/alert-rules/{id}` - Update alert rule
- `PATCH /api/v1/alert-rules/{id}/toggle` - Toggle rule
- `POST /api/v1/alert-rules/evaluate` - Evaluate rules now
- `DELETE /api/v1/alert-rules/{id}` - Delete alert rule

### Topics
- `GET /api/v1/topics` - List custom topics
- `POST /api/v1/topics` - Create topic
- `PUT /api/v1/topics/{id}` - Update topic
- `DELETE /api/v1/topics/{id}` - Delete topic

### Bookmarks
- `GET /api/v1/bookmarks` - Get bookmarked articles
- `POST /api/v1/bookmarks/articles/{articleId}` - Add bookmark
- `DELETE /api/v1/bookmarks/articles/{articleId}` - Remove bookmark
- `POST /api/v1/bookmarks/check` - Batch check bookmarks
- `GET /api/v1/bookmarks/count` - Bookmark count

### Discussions
- `GET /api/v1/discussions` - List threads
- `POST /api/v1/discussions` - Create thread
- `POST /api/v1/discussions/{id}/replies` - Add reply
- `GET /api/v1/discussions/mentions/unread` - Unread mentions
- `POST /api/v1/discussions/mentions/read-all` - Mark all mentions read

### Team Management
- `GET /api/v1/team/members` - List team members
- `GET /api/v1/team/slots` - Get remaining slots
- `POST /api/v1/team/members` - Add member
- `PUT /api/v1/team/members/{id}/role` - Update role
- `DELETE /api/v1/team/members/{id}` - Remove member

### Super Admin (ADMIN)
- `GET /api/v1/admin/organizations` - List organizations
- `POST /api/v1/admin/organizations` - Create organization
- `PUT /api/v1/admin/organizations/{id}` - Update organization
- `PATCH /api/v1/admin/organizations/{id}/toggle` - Toggle org
- `DELETE /api/v1/admin/organizations/{id}` - Delete organization
- Global user management endpoints

### Reports & Export
- `GET /api/v1/reports/types` - Available report types
- `GET /api/v1/reports/articles/excel` - Export articles to Excel
- `GET /api/v1/reports/alerts/excel` - Export alerts to Excel
- Supports: Weekly, Daily, Incident, EU DSA Compliance formats
- Export formats: CSV, Markdown, PDF, Excel

### Search
- `GET /api/v1/search?q=query` - Global search across entities

### Sources (ADMIN)
- `GET /api/v1/sources` - List news sources
- `GET /api/v1/sources/overview` - Source statistics
- `POST /api/v1/sources` - Add new source
- `PUT /api/v1/sources/{id}` - Update source
- `DELETE /api/v1/sources/{id}` - Delete source

### User Profile
- `GET /api/v1/user/me` - Current user profile
- `GET /api/v1/user/notifications` - Notification preferences
- `PUT /api/v1/user/notifications` - Update notification preferences
- `POST /api/v1/user/notifications/test-report` - Send test report

### Dashboard
- `GET /api/v1/dashboard/election` - Election monitoring dashboard data
- `GET /api/v1/dashboard/stats` - Overall statistics

### Sentiment
- `GET /api/v1/sentiment/aggregate` - Aggregated sentiment by day/source
- `GET /api/v1/sentiment/summary` - Overall sentiment counts

### WebSocket (Real-time)
- Endpoint: `/ws` (SockJS)
- `/topic/org/{orgId}/alerts` - Real-time alert notifications
- `/topic/org/{orgId}/articles` - Real-time article notifications
- `/topic/health` - System health updates

### System Health
- `GET /api/v1/system/health` - Application health status
- `GET /api/v1/system/status` - Detailed system status
- `GET /api/v1/health/pipeline` - Pipeline health metrics
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

### Render Deployment

The project includes `render.yaml` for deploying to the Render platform. Configure environment variables in the Render dashboard.

### Production Configuration

| Component | Configuration |
|-----------|--------------|
| **Nginx** | SSL termination, rate limiting (10 req/s), gzip compression |
| **Backend** | Connection pooling (10-50 connections), request compression, WebSocket support |
| **Database** | Optimized indexes, connection limits |
| **Redis** | Session caching, rate limit storage, dashboard cache |

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
- `/api/v1/health/pipeline` - Pipeline health metrics

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
- Multi-organization tenant isolation

### API Security

- Rate limiting: 10 requests/second per IP
- CORS configured for allowed origins
- Security headers (X-Frame-Options, X-Content-Type-Options, etc.)
- Input validation on all endpoints
- Organization-scoped data access

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
