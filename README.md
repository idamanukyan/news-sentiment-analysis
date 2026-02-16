# News Sentiment Analysis Platform

A multilingual news sentiment analysis platform for Armenian, Russian, and English media, focused on election monitoring and disinformation detection.

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
- `GET /api/v1/articles` - List articles with filters
- `GET /api/v1/articles/{id}` - Get article by ID

### Sentiment
- `GET /api/v1/sentiment/aggregate` - Aggregated sentiment by day/source
- `GET /api/v1/sentiment/summary` - Overall sentiment counts

### Sources
- `GET /api/v1/sources` - List news sources
- `GET /api/v1/sources/{id}` - Get source by ID

### Topics
- `GET /api/v1/topics` - List user's topics
- `POST /api/v1/topics` - Create topic
- `DELETE /api/v1/topics/{id}` - Delete topic

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

### Using Docker

```bash
# Build images
docker-compose build

# Push to registry
docker-compose push

# Deploy with production config
docker-compose -f docker-compose.prod.yml up -d
```

### CI/CD

- **CI**: Runs on every push/PR to main
- **Deploy**: Triggered by version tags (v1.0.0)

Create a release:
```bash
git tag v1.0.0
git push origin v1.0.0
```

## License

Proprietary - All rights reserved
