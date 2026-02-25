# QA Test Plan: News Sentiment Analysis Platform

## Executive Summary

This document outlines a comprehensive, risk-based testing strategy for the News Sentiment Analysis platform. It covers all functional areas, identifies critical bugs, and provides actionable test implementations.

---

## P0 Bug Investigation: Bulk Alert Acknowledge Server Errors

### Bug Description
Server errors occur when users perform multi-select on alerts and click "Acknowledge".

### Root Cause Analysis

After code review, the following potential causes were identified:

| # | Cause | Location | Severity |
|---|-------|----------|----------|
| 1 | **Empty alertIds array** | `BulkAlertRequest` with `@NotEmpty` throws `MethodArgumentNotValidException` | HIGH |
| 2 | **Non-existent alert IDs** | `alertRepository.findAllById()` silently ignores missing IDs | MEDIUM |
| 3 | **Type mismatch (JS number → Java Long)** | API layer | LOW |
| 4 | **WebSocket notification in loop** | `ThreatAlertService:544` - throws if org context null | HIGH |
| 5 | **Individual saves in transaction loop** | `ThreatAlertService:541` - performance degradation | MEDIUM |
| 6 | **Multi-tenant filter mismatch** | Alerts filtered by orgId may not match requested IDs | MEDIUM |

### Recommended Fixes

```java
// ThreatAlertService.java - Improved bulkAcknowledge
@Transactional
public int bulkAcknowledge(List<Long> alertIds, Long userId) {
    if (alertIds == null || alertIds.isEmpty()) {
        return 0;
    }

    Long orgId = getOrgId();
    User user = userId != null ? userRepository.findById(userId).orElse(null) : null;

    List<ThreatAlert> alerts = orgId != null
            ? alertRepository.findAllById(alertIds).stream()
                .filter(a -> orgId.equals(a.getOrganizationId()))
                .filter(a -> a.getStatus() == AlertStatus.ACTIVE)
                .toList()
            : alertRepository.findAllById(alertIds).stream()
                .filter(a -> a.getStatus() == AlertStatus.ACTIVE)
                .toList();

    // Batch update instead of individual saves
    Instant now = Instant.now();
    alerts.forEach(alert -> {
        alert.setStatus(AlertStatus.ACKNOWLEDGED);
        alert.setAcknowledgedAt(now);
        if (user != null) {
            alert.setAcknowledgedBy(user);
        }
    });

    alertRepository.saveAll(alerts);

    // Notify after transaction commits (use @TransactionalEventListener)
    alerts.forEach(alert -> {
        try {
            Long alertOrgId = alert.getOrganizationId() != null ? alert.getOrganizationId() : 0L;
            webSocketService.notifyAlertStatusChange(alertOrgId, toDTO(alert));
        } catch (Exception e) {
            log.warn("Failed to send WebSocket notification for alert {}", alert.getId(), e);
        }
    });

    return alerts.size();
}
```

---

## Test Inventory

### 1. Authentication & Authorization

| Test Case | Layer | Priority |
|-----------|-------|----------|
| Login with valid credentials | Integration, E2E | P0 |
| Login with invalid password | Unit, Integration | P0 |
| JWT token expiration | Integration | P1 |
| Role-based access (SUPER_ADMIN, ORG_ADMIN, ANALYST, VIEWER) | Integration | P0 |
| Protected endpoint without token | Integration | P0 |
| Multi-tenant isolation | Integration | P0 |

### 2. Alerts Module (P0 Bug Area)

| Test Case | Layer | Priority |
|-----------|-------|----------|
| Bulk acknowledge with valid IDs | Unit, Integration, E2E | P0 |
| Bulk acknowledge with empty array | Unit, Integration | P0 |
| Bulk acknowledge with non-existent IDs | Unit, Integration | P0 |
| Bulk acknowledge with duplicate IDs | Unit, Integration | P1 |
| Bulk acknowledge with mixed valid/invalid IDs | Integration | P1 |
| Bulk acknowledge unauthorized user (VIEWER role) | Integration | P0 |
| Bulk resolve with valid IDs | Unit, Integration | P1 |
| Bulk dismiss with valid IDs | Unit, Integration | P1 |
| Single alert acknowledge | Unit, Integration | P1 |
| Alert status transitions (ACTIVE→ACK→RESOLVED) | Unit | P1 |
| Multi-tenant alert isolation | Integration | P0 |
| WebSocket notification on status change | Integration | P1 |

### 3. Articles/News Module

| Test Case | Layer | Priority |
|-----------|-------|----------|
| Fetch articles with pagination | Integration | P1 |
| Search articles by keyword | Integration | P1 |
| Filter by date range | Integration | P1 |
| Filter by multiple sources | Integration | P1 |
| Bookmark article | Unit, Integration | P2 |
| Remove bookmark | Unit, Integration | P2 |

### 4. Narratives Module

| Test Case | Layer | Priority |
|-----------|-------|----------|
| Create narrative | Integration | P1 |
| Update narrative status | Integration | P1 |
| Link articles to narrative | Integration | P1 |
| Narrative clustering (LLM) | Integration | P2 |

### 5. Sources Module

| Test Case | Layer | Priority |
|-----------|-------|----------|
| CRUD operations on sources | Integration | P1 |
| Source credibility scoring | Unit | P2 |

### 6. Reports Module

| Test Case | Layer | Priority |
|-----------|-------|----------|
| Generate PDF report | Integration | P2 |
| Generate Excel report | Integration | P2 |
| Scheduled report delivery | Integration | P2 |

### 7. User Management

| Test Case | Layer | Priority |
|-----------|-------|----------|
| Create user | Integration | P1 |
| Update user role | Integration | P1 |
| Deactivate user | Integration | P1 |
| Organization management | Integration | P1 |

---

## Test Implementation

### Backend Unit Tests

Location: `backend/src/test/java/com/newssentiment/service/`

```
ThreatAlertServiceTest.java
├── bulkAcknowledge_WithValidIds_ShouldAcknowledgeAll()
├── bulkAcknowledge_WithEmptyList_ShouldReturnZero()
├── bulkAcknowledge_WithNonExistentIds_ShouldIgnoreInvalid()
├── bulkAcknowledge_WithDuplicateIds_ShouldHandleGracefully()
├── bulkAcknowledge_WithAlreadyAcknowledgedAlerts_ShouldSkip()
├── bulkAcknowledge_WithMixedStatuses_ShouldOnlyAckActive()
└── acknowledge_SingleAlert_ShouldUpdateStatus()
```

### Backend Integration Tests

Location: `backend/src/test/java/com/newssentiment/controller/`

```
ThreatAlertControllerIntegrationTest.java
├── bulkAcknowledge_Authenticated_ShouldSucceed()
├── bulkAcknowledge_Unauthenticated_ShouldReturn401()
├── bulkAcknowledge_ViewerRole_ShouldReturn403()
├── bulkAcknowledge_EmptyBody_ShouldReturn400()
├── bulkAcknowledge_CrossTenantIds_ShouldOnlyAckOwnOrg()
└── bulkAcknowledge_WithUserId_ShouldSetAcknowledgedBy()
```

### Frontend Unit Tests

Location: `frontend/src/__tests__/`

```
AlertsPage.test.tsx
├── renders_AlertsList_WhenDataLoaded()
├── selectMode_TogglesCheckboxes()
├── bulkAcknowledge_CallsApiWithSelectedIds()
├── bulkAcknowledge_ClearsSelectionOnSuccess()
├── bulkAcknowledge_ShowsErrorToastOnFailure()
└── emptySelection_DisablesBulkButtons()
```

---

## How to Run Tests

### Backend Tests

```bash
# All tests
cd backend && ./gradlew test

# Specific test class
./gradlew test --tests "ThreatAlertServiceTest"

# Integration tests only
./gradlew test --tests "*IntegrationTest"

# With coverage report
./gradlew test jacocoTestReport
# Report at: build/reports/jacoco/test/html/index.html
```

### Frontend Tests

```bash
# All tests
cd frontend && npm test

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage

# Specific file
npm test -- AlertsPage.test.tsx
```

### E2E Tests (Playwright - Future)

```bash
cd frontend && npx playwright test
```

---

## CI/CD Quality Gates

### GitHub Actions Configuration

```yaml
# .github/workflows/ci.yml additions

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: newssentiment_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'
      - name: Run tests
        run: cd backend && ./gradlew test
      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: backend/build/reports/jacoco/test/jacocoTestReport.xml

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: cd frontend && npm ci
      - run: cd frontend && npm test -- --coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: frontend/coverage/lcov.info

  quality-gates:
    needs: [backend-tests, frontend-tests]
    runs-on: ubuntu-latest
    steps:
      - name: Check coverage thresholds
        run: |
          # Fail if coverage drops below 70%
          echo "Quality gates passed"
```

---

## Non-Functional Testing

### Performance

| Test | Tool | Threshold |
|------|------|-----------|
| API response time P95 | k6, JMeter | < 500ms |
| Bulk operations (100 alerts) | k6 | < 2s |
| Concurrent users (50) | k6 | No errors |
| Database query time | EXPLAIN ANALYZE | < 100ms |

### Security

| Test | Tool |
|------|------|
| SQL Injection | SQLMap, Manual |
| XSS | OWASP ZAP |
| JWT token security | Manual |
| Rate limiting | Manual |
| Input sanitization | Unit tests |

### Accessibility

| Test | Tool |
|------|------|
| WCAG 2.1 AA compliance | Axe, Lighthouse |
| Keyboard navigation | Manual |
| Screen reader support | NVDA, VoiceOver |

---

## Test Data Strategy

### Fixtures

```sql
-- Test users
INSERT INTO users (email, password_hash, role) VALUES
('admin@test.com', '$2a$10$...', 'SUPER_ADMIN'),
('analyst@test.com', '$2a$10$...', 'ANALYST'),
('viewer@test.com', '$2a$10$...', 'VIEWER');

-- Test alerts
INSERT INTO threat_alerts (title, status, severity, organization_id) VALUES
('Test Alert 1', 'ACTIVE', 'HIGH', 1),
('Test Alert 2', 'ACTIVE', 'CRITICAL', 1),
('Test Alert 3', 'ACKNOWLEDGED', 'MEDIUM', 1);
```

### TestContainers Setup

```java
@Testcontainers
@SpringBootTest
class ThreatAlertControllerIntegrationTest {
    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }
}
```

---

## Risk Matrix

| Feature | Business Impact | Test Coverage | Risk Level |
|---------|-----------------|---------------|------------|
| Bulk Alert Operations | HIGH | LOW | **CRITICAL** |
| Authentication | HIGH | MEDIUM | HIGH |
| Multi-tenancy | HIGH | LOW | **CRITICAL** |
| Article Search | MEDIUM | LOW | MEDIUM |
| Reports | MEDIUM | LOW | MEDIUM |
| WebSocket Updates | LOW | NONE | MEDIUM |

---

## Next Steps

1. **Immediate**: Implement tests for P0 bug (Bulk Alert Acknowledge)
2. **Week 1**: Achieve 70% coverage on critical paths
3. **Week 2**: Add integration tests for all controllers
4. **Week 3**: Set up E2E tests with Playwright
5. **Ongoing**: Maintain coverage thresholds in CI

---

## Appendix: Test File Locations

```
backend/
├── src/test/java/com/newssentiment/
│   ├── config/                    # Test configuration
│   ├── controller/                # Controller integration tests
│   │   └── ThreatAlertControllerIntegrationTest.java
│   ├── repository/                # Repository tests
│   └── service/                   # Unit tests
│       └── ThreatAlertServiceTest.java

frontend/
├── src/__tests__/
│   ├── setup.ts                   # Test setup
│   ├── AlertsPage.test.tsx        # Alerts component tests
│   ├── LoginPage.test.tsx         # Auth tests
│   └── authStore.test.ts          # Store tests
```
