# AIIM Development Setup Guide

This guide walks you through setting up the AIIM development environment from scratch.

## Prerequisites

### Required Software

| Software | Version | Installation |
|----------|---------|--------------|
| Docker | 24+ | [docs.docker.com](https://docs.docker.com/get-docker/) |
| Docker Compose | 2.20+ | Included with Docker Desktop |
| Java | 21 | `brew install openjdk@21` or [adoptium.net](https://adoptium.net/) |
| Node.js | 20 LTS | `brew install node@20` or [nodejs.org](https://nodejs.org/) |
| Python | 3.12 | `brew install python@3.12` or [python.org](https://python.org/) |
| Git | 2.40+ | `brew install git` |

### Verify Installation

```bash
# Check versions
docker --version          # Docker version 24.x.x
docker compose version    # Docker Compose version v2.x.x
java -version            # openjdk version "21.x.x"
node --version           # v20.x.x
python3 --version        # Python 3.12.x
git --version            # git version 2.x.x
```

## Quick Start (Docker)

The fastest way to get started is using Docker Compose:

```bash
# 1. Clone the repository
git clone <repo-url>
cd news-analysis

# 2. Copy environment file
cp .env.example .env

# 3. (Optional) Add your Anthropic API key for sentiment analysis
# Edit .env and set: ANTHROPIC_API_KEY=sk-ant-xxx

# 4. Start all services
docker compose up -d

# 5. Wait for services to be healthy (about 30 seconds)
docker compose ps

# 6. Access the application
# Frontend: http://localhost:5173
# Backend:  http://localhost:8080
# Swagger:  http://localhost:8080/swagger-ui.html
```

### Demo Accounts

| Email | Password | Role |
|-------|----------|------|
| admin@aiim.am | testpass123 | ADMIN |
| analyst@aiim.am | testpass123 | ANALYST |
| viewer@aiim.am | testpass123 | VIEWER |

## Local Development Setup

For active development, run services locally for faster iteration.

### 1. Start Infrastructure Services

Start only the database and Redis:

```bash
docker compose up -d postgres redis
```

### 2. Backend Setup (Spring Boot)

```bash
cd backend

# Install dependencies and build
./gradlew build -x test

# Run the application
./gradlew bootRun

# Or run with specific profile
./gradlew bootRun --args='--spring.profiles.active=dev'
```

The backend will be available at `http://localhost:8080`.

#### Backend Environment Variables

Create `backend/.env` or set these in your IDE:

```properties
# Database (uses Docker postgres)
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/newssentiment
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=postgres

# Redis
SPRING_DATA_REDIS_HOST=localhost
SPRING_DATA_REDIS_PORT=6379

# JWT Secret (development only)
JWT_SECRET=dev-secret-key-min-64-characters-long-for-hs512-algorithm-here

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### 3. Frontend Setup (React + Vite)

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev

# Run with different backend URL
VITE_API_URL=http://localhost:8080 npm run dev
```

The frontend will be available at `http://localhost:5173`.

#### Frontend Environment Variables

Create `frontend/.env.local`:

```properties
VITE_API_URL=http://localhost:8080
```

### 4. Scraper Setup (Python)

```bash
cd scraper

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Edit .env and add your Anthropic API key
# ANTHROPIC_API_KEY=sk-ant-xxx

# Run scraper
python -m src.main
```

## IDE Setup

### IntelliJ IDEA (Backend)

1. Open `backend/` as a project
2. Set Project SDK to Java 21
3. Enable Gradle auto-import
4. Install plugins: Lombok, Spring Boot

**Run Configuration:**
- Main class: `com.newssentiment.NewsSentimentApplication`
- Active profiles: `dev`
- Environment variables: (see Backend Environment Variables above)

### VS Code (Frontend)

1. Open `frontend/` folder
2. Install recommended extensions:
   - ESLint
   - Prettier
   - TypeScript Vue Plugin (Volar)
   - Tailwind CSS IntelliSense

**settings.json:**
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

### PyCharm (Scraper)

1. Open `scraper/` as a project
2. Set Python interpreter to venv
3. Mark `src/` as Sources Root

## Database Management

### Access PostgreSQL

```bash
# Via Docker
docker compose exec postgres psql -U postgres -d newssentiment

# Or use a GUI client (DBeaver, pgAdmin) with:
# Host: localhost
# Port: 5432
# Database: newssentiment
# User: postgres
# Password: postgres
```

### Run Migrations Manually

Migrations run automatically on startup via Flyway. To run manually:

```bash
cd backend
./gradlew flywayMigrate
```

### Reset Database

```bash
# Stop services
docker compose down

# Remove volume
docker volume rm news-analysis_postgres_data

# Restart (will recreate with fresh migrations)
docker compose up -d postgres
```

### Create New Migration

Create a new file in `backend/src/main/resources/db/migration/`:

```
V{next_version}__{description}.sql
```

Example: `V7__add_user_preferences.sql`

## Testing

### Backend Tests

```bash
cd backend

# Run all tests
./gradlew test

# Run specific test class
./gradlew test --tests "NarrativeServiceTest"

# Run with coverage report
./gradlew test jacocoTestReport
# Report: build/reports/jacoco/test/html/index.html
```

### Frontend Tests

```bash
cd frontend

# Run tests
npm run test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Integration Tests

Integration tests use Testcontainers and require Docker:

```bash
cd backend
./gradlew test --tests "*IntegrationTest"
```

## Common Issues

### Port Already in Use

```bash
# Find process using port 8080
lsof -i :8080

# Kill process
kill -9 <PID>

# Or change port in application.yml
server:
  port: 8081
```

### Docker Out of Memory

Increase Docker memory allocation:
- Docker Desktop > Settings > Resources > Memory: 4GB+

### Gradle Build Fails

```bash
# Clean and rebuild
cd backend
./gradlew clean build -x test

# Clear Gradle cache
rm -rf ~/.gradle/caches
```

### Node Modules Issues

```bash
# Remove and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Database Connection Refused

```bash
# Check if postgres is running
docker compose ps postgres

# Check logs
docker compose logs postgres

# Restart postgres
docker compose restart postgres
```

### CORS Errors

Ensure `CORS_ORIGINS` includes your frontend URL:

```yaml
# application.yml
app:
  cors:
    allowed-origins: http://localhost:5173,http://localhost:3000
```

## Development Workflow

### Feature Development

1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes
3. Run tests: `./gradlew test` and `npm run test`
4. Commit: `git commit -m "Add feature X"`
5. Push and create PR

### API Development

1. Add/modify endpoint in controller
2. Update DTOs if needed
3. Add service logic
4. Write unit tests
5. Test with Swagger UI: http://localhost:8080/swagger-ui.html

### Database Changes

1. Create migration file in `db/migration/`
2. Restart backend to apply
3. Update JPA entities to match schema
4. Update repositories/services as needed

## Useful Commands

```bash
# View all logs
docker compose logs -f

# View specific service logs
docker compose logs -f backend

# Restart specific service
docker compose restart backend

# Rebuild specific service
docker compose up -d --build backend

# Check service health
./scripts/healthcheck.sh

# Database backup
./scripts/deploy.sh backup

# Full restart
docker compose down && docker compose up -d
```

## Next Steps

- Review the [README.md](../README.md) for API documentation
- Explore [Swagger UI](http://localhost:8080/swagger-ui.html) for API testing
- Check [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines
