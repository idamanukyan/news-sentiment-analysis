# Development Guide

## Local Development Setup

### Prerequisites

1. **Java 21**
   ```bash
   # macOS with Homebrew
   brew install openjdk@21

   # Verify
   java -version
   ```

2. **Node.js 20**
   ```bash
   # macOS with Homebrew
   brew install node@20

   # Or use nvm
   nvm install 20
   nvm use 20
   ```

3. **Python 3.12**
   ```bash
   # macOS with Homebrew
   brew install python@3.12

   # Verify
   python3 --version
   ```

4. **Docker Desktop**
   - Download from https://www.docker.com/products/docker-desktop

5. **PostgreSQL (optional, for local without Docker)**
   ```bash
   brew install postgresql@16
   ```

### Database Setup (without Docker)

```bash
# Start PostgreSQL
brew services start postgresql@16

# Create database
createdb newssentiment

# Run migrations (from backend directory)
./gradlew flywayMigrate
```

### Running Services Locally

#### Option 1: Docker for dependencies only

```bash
# Start only PostgreSQL and Redis
docker-compose up -d postgres redis

# Run backend
cd backend && ./gradlew bootRun

# Run frontend (in another terminal)
cd frontend && npm run dev

# Run scraper (in another terminal)
cd scraper && python -m src.main
```

#### Option 2: Full Docker stack

```bash
docker-compose up
```

### IDE Setup

#### IntelliJ IDEA (Backend)

1. Open the `backend` folder
2. IntelliJ should detect Gradle project
3. Set Project SDK to Java 21
4. Enable annotation processing for Lombok

#### VS Code (Frontend/Scraper)

Recommended extensions:
- ESLint
- Prettier
- TypeScript Vue Plugin
- Python
- Pylance

## Code Style

### Java (Backend)

- Follow Google Java Style Guide
- Use Lombok annotations
- Use records for DTOs

### TypeScript (Frontend)

- Use functional components with hooks
- Prefer named exports
- Use TypeScript strict mode

### Python (Scraper)

- Follow PEP 8
- Use type hints
- Use dataclasses or Pydantic models

## Testing

### Backend Tests

```bash
cd backend

# Run all tests
./gradlew test

# Run specific test class
./gradlew test --tests "ArticleServiceTest"

# Run with coverage
./gradlew test jacocoTestReport
```

### Frontend Tests

```bash
cd frontend

# Run tests
npm run test

# Run with coverage
npm run test -- --coverage

# Run in watch mode
npm run test -- --watch
```

### Scraper Tests

```bash
cd scraper

# Activate virtual environment
source venv/bin/activate

# Run tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=src --cov-report=html
```

## Debugging

### Backend Debugging

1. Start with debug mode:
   ```bash
   ./gradlew bootRun --debug-jvm
   ```
2. Attach debugger on port 5005

### Frontend Debugging

- Use browser DevTools
- React DevTools extension
- Console logging

### Scraper Debugging

```bash
# Run with verbose logging
LOG_LEVEL=DEBUG python -m src.main
```

## Database Operations

### Access PostgreSQL CLI

```bash
# With Docker
docker exec -it newssentiment-db psql -U postgres -d newssentiment

# Local
psql -U postgres -d newssentiment
```

### Useful Queries

```sql
-- Count articles by source
SELECT s.name, COUNT(a.id) as article_count
FROM sources s
LEFT JOIN articles a ON s.id = a.source_id
GROUP BY s.id, s.name;

-- Sentiment distribution
SELECT sentiment, COUNT(*) as count
FROM sentiment_results
GROUP BY sentiment;

-- Recent articles
SELECT a.title, s.name, sr.sentiment
FROM articles a
JOIN sources s ON a.source_id = s.id
LEFT JOIN sentiment_results sr ON a.id = sr.article_id
ORDER BY a.published_at DESC
LIMIT 10;
```

### Reset Database

```bash
# Drop and recreate
docker-compose down -v
docker-compose up -d postgres
```

## Git Workflow

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `refactor/description` - Code refactoring
- `docs/description` - Documentation

### Commit Messages

Follow conventional commits:
```
feat: add sentiment trend chart
fix: correct date parsing for RSS feeds
docs: update API documentation
refactor: extract auth logic to service
```

### Pull Request Process

1. Create feature branch
2. Make changes
3. Run tests locally
4. Push and create PR
5. Wait for CI to pass
6. Request review
7. Merge after approval

## Common Issues

### Port Already in Use

```bash
# Find process using port
lsof -i :8080

# Kill process
kill -9 <PID>
```

### Docker Out of Space

```bash
# Clean up Docker
docker system prune -a
```

### Gradle Build Issues

```bash
# Clean build
./gradlew clean build

# Refresh dependencies
./gradlew --refresh-dependencies
```

### Node Modules Issues

```bash
# Remove and reinstall
rm -rf node_modules package-lock.json
npm install
```
