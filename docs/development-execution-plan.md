# News Sentiment Analysis Platform: Development Execution Plan

**Version:** 1.0
**Prepared:** February 2026
**Target:** Solo Founder / Early-Stage Startup
**Stack:** Java/Spring Boot, React, Python, PostgreSQL, Docker

---

## Executive Summary

This document provides a complete engineering roadmap for building a multilingual news sentiment analysis platform targeting Armenian, Russian, and English media. The plan is designed for a solo technical founder with a 6-month runway to MVP, optimizing for speed-to-market while building defensible assets (proprietary dataset).

**Core Architecture Philosophy:** Build a modular monolith first, extract services only when scaling demands it. Use managed services aggressively to reduce ops burden. Treat the labeled dataset as a first-class product artifact.

---

## Part 1: Phased Development Plan

### Phase 0: Discovery & Validation (Weeks 1-3)

#### Business Objective
Validate demand and secure 1-2 design partners before writing production code.

#### Technical Objective
Prove technical feasibility of Armenian sentiment analysis using LLM APIs; establish baseline accuracy metrics.

#### Activities

| Activity | Output | Effort |
|----------|--------|--------|
| Customer discovery calls (5-8 potential users) | Documented requirements, 1-2 LOIs | Medium |
| Competitive technical analysis | Gap analysis document | Low |
| LLM accuracy benchmark for Armenian text | Benchmark report (accuracy %, latency, cost) | Medium |
| Data source audit (RSS feeds, scraping feasibility) | Source inventory spreadsheet | Low |
| Architecture spike: end-to-end prototype | Working Jupyter notebook demo | Medium |

#### Deliverables
- [ ] Design partner agreement (1 minimum)
- [ ] Technical feasibility report
- [ ] Prioritized feature backlog
- [ ] Finalized MVP scope document

#### Success Metrics
- 1+ signed design partner
- LLM sentiment accuracy >75% on Armenian test set (100 samples)
- 15+ viable data sources identified

#### Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| No design partner commits | Medium | High | Offer free 6-month access; target international orgs first |
| LLM Armenian accuracy too low | Low | High | Pivot to translation-first approach |
| Key news sources block scraping | Medium | Medium | Prioritize RSS; build publisher relationships |

---

### Phase 1: Foundation & Core Pipeline (Weeks 4-10)

#### Business Objective
Build functioning data pipeline that collects and analyzes news from 10-15 sources daily.

#### Technical Objective
Establish production-grade data ingestion, storage, and basic sentiment classification.

#### Features/Modules

| Module | Description | Priority |
|--------|-------------|----------|
| Source Manager | Configure and manage news sources (RSS, scraper configs) | P0 |
| Content Ingester | Fetch, deduplicate, store articles | P0 |
| Sentiment Analyzer | LLM-based sentiment classification | P0 |
| Article Store | PostgreSQL schema for articles + metadata | P0 |
| Admin CLI | Basic commands for source management, manual runs | P1 |
| Health Monitoring | Basic alerting for pipeline failures | P1 |

#### Architecture Components
```
┌─────────────────────────────────────────────────────────────────┐
│                     PHASE 1 ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │ RSS Fetcher  │───▶│   Content    │───▶│  PostgreSQL  │      │
│  │   (Java)     │    │  Processor   │    │   Articles   │      │
│  └──────────────┘    │   (Java)     │    └──────────────┘      │
│                      └──────┬───────┘            ▲              │
│  ┌──────────────┐           │                    │              │
│  │Web Scraper   │───────────┘                    │              │
│  │  (Python)    │                                │              │
│  └──────────────┘                                │              │
│                      ┌──────────────┐            │              │
│                      │  Sentiment   │────────────┘              │
│                      │  Analyzer    │                           │
│                      │  (Python)    │                           │
│                      └──────┬───────┘                           │
│                             │                                   │
│                      ┌──────▼───────┐                           │
│                      │  Claude/GPT  │                           │
│                      │     API      │                           │
│                      └──────────────┘                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Deliverables
- [ ] Working ingestion pipeline (10+ sources)
- [ ] Sentiment analysis running on all new articles
- [ ] PostgreSQL schema v1
- [ ] Docker Compose local dev environment
- [ ] Basic operational runbook

#### Success Metrics
- Pipeline uptime >95%
- <30 min latency from publish to analysis
- Processing 200+ articles/day
- Sentiment classification cost <$50/month

#### Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| LLM API costs exceed budget | Medium | High | Implement caching, batch processing, rate limits |
| Scraper maintenance burden | High | Medium | Prioritize RSS; build self-healing scrapers |
| Data model wrong for future needs | Medium | Medium | Design for extension; use JSONB for flexible metadata |

---

### Phase 2: MVP Dashboard & User Features (Weeks 11-18)

#### Business Objective
Deliver usable product to design partners; gather feedback for iteration.

#### Technical Objective
Build web dashboard with core analytics features; implement user authentication.

#### Features/Modules

| Module | Description | Priority |
|--------|-------------|----------|
| User Authentication | Email/password auth, basic roles | P0 |
| Sentiment Dashboard | Real-time sentiment trends by topic/source | P0 |
| Source Browser | View/filter articles by source, date, sentiment | P0 |
| Topic Tracking | Define topics/keywords to monitor | P0 |
| Email Alerts | Daily digest + spike alerts | P0 |
| Export | CSV export of filtered data | P1 |
| API v1 | REST endpoints for dashboard | P0 |

#### Architecture Components
```
┌─────────────────────────────────────────────────────────────────────────┐
│                        PHASE 2 ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                         FRONTEND                                │   │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │   │
│   │  │   React     │  │   Charts    │  │   Auth      │             │   │
│   │  │   Router    │  │ (Recharts)  │  │   Context   │             │   │
│   │  └─────────────┘  └─────────────┘  └─────────────┘             │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                    │
│                                    ▼                                    │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                     BACKEND (Spring Boot)                       │   │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │   │
│   │  │   REST API  │  │  Auth/JWT   │  │  Scheduled  │             │   │
│   │  │ Controllers │  │   Filter    │  │    Jobs     │             │   │
│   │  └─────────────┘  └─────────────┘  └─────────────┘             │   │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │   │
│   │  │  Article    │  │  Sentiment  │  │   Alert     │             │   │
│   │  │  Service    │  │  Service    │  │  Service    │             │   │
│   │  └─────────────┘  └─────────────┘  └─────────────┘             │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                    │
│                                    ▼                                    │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                         DATA LAYER                              │   │
│   │  ┌─────────────────────────┐  ┌─────────────────────────┐      │   │
│   │  │      PostgreSQL         │  │        Redis            │      │   │
│   │  │  - Articles             │  │  - Session cache        │      │   │
│   │  │  - Users                │  │  - Rate limiting        │      │   │
│   │  │  - Topics               │  │  - Query cache          │      │   │
│   │  │  - Alerts               │  │                         │      │   │
│   │  └─────────────────────────┘  └─────────────────────────┘      │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Deliverables
- [ ] Deployed web application (production URL)
- [ ] User documentation
- [ ] Design partner onboarded and using daily
- [ ] Feedback collection system (in-app + calls)
- [ ] API documentation

#### Success Metrics
- 2+ active daily users (design partners)
- Dashboard load time <2s
- Email open rate >40%
- Net Promoter Score >30 from design partners

#### Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Scope creep from partner feedback | High | Medium | Strict change control; log all requests, implement <20% |
| Dashboard performance issues | Medium | Medium | Implement pagination, caching from start |
| Security vulnerabilities | Medium | High | Use Spring Security defaults; security audit before launch |

---

### Phase 3: Pilot & Monetization (Weeks 19-24)

#### Business Objective
Convert design partners to paying customers; acquire 3-5 additional paying users.

#### Technical Objective
Implement billing, improve reliability to production SLA, begin dataset labeling.

#### Features/Modules

| Module | Description | Priority |
|--------|-------------|----------|
| Billing Integration | Stripe subscription management | P0 |
| Usage Tracking | Track API calls, articles analyzed per account | P0 |
| Labeling Interface | Internal tool for human sentiment verification | P0 |
| Enhanced Topics | Topic auto-detection, entity extraction | P1 |
| Report Generator | PDF export of weekly/monthly reports | P1 |
| Multi-language UI | Armenian, Russian interface options | P2 |

#### Deliverables
- [ ] Payment processing live
- [ ] 3+ paying customers
- [ ] 1,000+ labeled Armenian sentiment samples
- [ ] Production monitoring dashboard
- [ ] Incident response runbook

#### Success Metrics
- MRR >$1,000
- Churn rate <10% monthly
- Pipeline uptime >99%
- Labeling throughput: 50+ samples/day

---

### Phase 4: Scale Preparation (Post-MVP, Months 7-12)

#### Business Objective
Reach $5K MRR; prepare for seed fundraise.

#### Technical Objective
Extract ML pipeline to dedicated service; train custom model; expand sources.

#### Key Initiatives
- Train fine-tuned sentiment model on labeled data (reduce API dependency)
- Expand to 50+ sources
- API productization for external developers
- Georgian/Azerbaijani language exploration
- SOC 2 Type 1 preparation

---

## Part 2: Task-Level Roadmap

### Epic Structure

```
E1: Data Infrastructure
├── E1.1: Source Management
├── E1.2: Content Ingestion
├── E1.3: Storage & Schema
└── E1.4: Pipeline Orchestration

E2: Sentiment Analysis
├── E2.1: LLM Integration
├── E2.2: Classification Pipeline
├── E2.3: Accuracy Monitoring
└── E2.4: Cost Optimization

E3: Backend Platform
├── E3.1: Authentication
├── E3.2: Core APIs
├── E3.3: Alert System
└── E3.4: Billing

E4: Frontend Dashboard
├── E4.1: Core UI Framework
├── E4.2: Sentiment Views
├── E4.3: Topic Management
└── E4.4: User Settings

E5: Dataset & ML
├── E5.1: Labeling Pipeline
├── E5.2: Quality Control
├── E5.3: Model Training
└── E5.4: Model Serving

E6: Infrastructure & DevOps
├── E6.1: CI/CD Pipeline
├── E6.2: Production Environment
├── E6.3: Monitoring
└── E6.4: Security
```

### Detailed Story Breakdown

#### E1: Data Infrastructure

| Story ID | Story | Dependencies | Effort | Phase |
|----------|-------|--------------|--------|-------|
| E1.1.1 | Design source configuration schema | None | Low | 1 |
| E1.1.2 | Implement RSS feed fetcher | E1.1.1 | Medium | 1 |
| E1.1.3 | Implement generic web scraper framework | E1.1.1 | High | 1 |
| E1.1.4 | Build 10 Armenian source scrapers | E1.1.3 | High | 1 |
| E1.1.5 | Build 5 Russian source scrapers | E1.1.3 | Medium | 1 |
| E1.2.1 | Design article deduplication logic | None | Medium | 1 |
| E1.2.2 | Implement content extraction (boilerplate removal) | None | Medium | 1 |
| E1.2.3 | Build article normalization pipeline | E1.2.2 | Medium | 1 |
| E1.3.1 | Design PostgreSQL schema v1 | None | Medium | 1 |
| E1.3.2 | Implement article repository | E1.3.1 | Low | 1 |
| E1.3.3 | Add full-text search indexes | E1.3.1 | Low | 1 |
| E1.4.1 | Implement scheduled job framework | None | Medium | 1 |
| E1.4.2 | Build pipeline health checks | E1.4.1 | Low | 1 |
| E1.4.3 | Implement retry/dead-letter handling | E1.4.1 | Medium | 1 |

#### E2: Sentiment Analysis

| Story ID | Story | Dependencies | Effort | Phase |
|----------|-------|--------------|--------|-------|
| E2.1.1 | Design LLM prompt for sentiment (Armenian) | None | Medium | 1 |
| E2.1.2 | Design LLM prompt for sentiment (Russian) | None | Low | 1 |
| E2.1.3 | Implement Claude API client with retries | None | Low | 1 |
| E2.1.4 | Implement OpenAI API client (fallback) | None | Low | 1 |
| E2.2.1 | Build sentiment classification service | E2.1.3 | Medium | 1 |
| E2.2.2 | Implement batch processing for cost efficiency | E2.2.1 | Medium | 1 |
| E2.2.3 | Add confidence scoring | E2.2.1 | Low | 1 |
| E2.3.1 | Build accuracy tracking dashboard | E2.2.1 | Medium | 2 |
| E2.3.2 | Implement human review sampling | E2.2.1, E5.1.1 | Medium | 3 |
| E2.4.1 | Implement response caching | E2.2.1 | Low | 1 |
| E2.4.2 | Add rate limiting per source | E2.2.1 | Low | 1 |

#### E3: Backend Platform

| Story ID | Story | Dependencies | Effort | Phase |
|----------|-------|--------------|--------|-------|
| E3.1.1 | Implement JWT authentication | None | Medium | 2 |
| E3.1.2 | Build user registration/login endpoints | E3.1.1 | Low | 2 |
| E3.1.3 | Implement password reset flow | E3.1.2 | Low | 2 |
| E3.1.4 | Add role-based access control | E3.1.1 | Medium | 2 |
| E3.2.1 | Build articles query API | E1.3.2 | Medium | 2 |
| E3.2.2 | Build sentiment aggregation API | E2.2.1 | Medium | 2 |
| E3.2.3 | Build topics CRUD API | None | Low | 2 |
| E3.2.4 | Build sources list API | E1.1.1 | Low | 2 |
| E3.3.1 | Design alert configuration schema | None | Low | 2 |
| E3.3.2 | Implement alert evaluation engine | E3.3.1, E2.2.1 | Medium | 2 |
| E3.3.3 | Build email notification service | E3.3.2 | Medium | 2 |
| E3.3.4 | Implement daily digest generation | E3.3.3 | Medium | 2 |
| E3.4.1 | Integrate Stripe subscriptions | None | High | 3 |
| E3.4.2 | Build usage metering | E3.4.1 | Medium | 3 |
| E3.4.3 | Implement subscription management UI | E3.4.1 | Medium | 3 |

#### E4: Frontend Dashboard

| Story ID | Story | Dependencies | Effort | Phase |
|----------|-------|--------------|--------|-------|
| E4.1.1 | Set up React project with TypeScript | None | Low | 2 |
| E4.1.2 | Implement auth context and protected routes | E3.1.1 | Medium | 2 |
| E4.1.3 | Build responsive layout shell | E4.1.1 | Medium | 2 |
| E4.1.4 | Implement API client with error handling | E4.1.1 | Medium | 2 |
| E4.2.1 | Build sentiment trend chart component | E4.1.3 | Medium | 2 |
| E4.2.2 | Build source comparison view | E4.2.1 | Medium | 2 |
| E4.2.3 | Build article list with filters | E4.1.3 | Medium | 2 |
| E4.2.4 | Build article detail modal | E4.2.3 | Low | 2 |
| E4.3.1 | Build topic creation/edit form | E4.1.3 | Low | 2 |
| E4.3.2 | Build topic dashboard view | E4.3.1 | Medium | 2 |
| E4.4.1 | Build user profile page | E4.1.2 | Low | 2 |
| E4.4.2 | Build alert configuration UI | E3.3.1 | Medium | 2 |

#### E5: Dataset & ML

| Story ID | Story | Dependencies | Effort | Phase |
|----------|-------|--------------|--------|-------|
| E5.1.1 | Design labeling data model | None | Low | 3 |
| E5.1.2 | Build internal labeling web UI | E5.1.1 | High | 3 |
| E5.1.3 | Implement labeling queue management | E5.1.2 | Medium | 3 |
| E5.2.1 | Implement inter-annotator agreement tracking | E5.1.2 | Medium | 3 |
| E5.2.2 | Build quality control dashboard | E5.2.1 | Medium | 3 |
| E5.3.1 | Set up ML training pipeline (Python) | E5.1.1 | High | 4 |
| E5.3.2 | Train baseline Armenian sentiment model | E5.3.1 | High | 4 |
| E5.3.3 | Implement model evaluation framework | E5.3.2 | Medium | 4 |
| E5.4.1 | Build model serving API | E5.3.2 | Medium | 4 |
| E5.4.2 | Implement A/B testing for model vs LLM | E5.4.1 | Medium | 4 |

#### E6: Infrastructure & DevOps

| Story ID | Story | Dependencies | Effort | Phase |
|----------|-------|--------------|--------|-------|
| E6.1.1 | Set up GitHub Actions CI pipeline | None | Medium | 1 |
| E6.1.2 | Add automated testing to CI | E6.1.1 | Medium | 1 |
| E6.1.3 | Implement CD to staging environment | E6.1.1, E6.2.1 | Medium | 2 |
| E6.2.1 | Provision cloud infrastructure (Terraform) | None | High | 1 |
| E6.2.2 | Set up managed PostgreSQL | E6.2.1 | Low | 1 |
| E6.2.3 | Set up Redis cache | E6.2.1 | Low | 2 |
| E6.2.4 | Configure Docker deployment | E6.2.1 | Medium | 1 |
| E6.3.1 | Set up application logging (structured) | None | Medium | 1 |
| E6.3.2 | Implement health check endpoints | None | Low | 1 |
| E6.3.3 | Set up uptime monitoring | E6.2.1 | Low | 2 |
| E6.3.4 | Configure alerting (PagerDuty/Slack) | E6.3.3 | Low | 2 |
| E6.4.1 | Implement rate limiting | None | Low | 2 |
| E6.4.2 | Set up SSL/TLS certificates | E6.2.1 | Low | 1 |
| E6.4.3 | Implement API key management | E3.1.1 | Medium | 3 |

### Dependency Graph (Critical Path)

```
Week 1-3: Discovery
    │
    ▼
Week 4: E6.2.1 (Infrastructure) ──────────────────────────┐
    │                                                      │
    ▼                                                      ▼
Week 5-6: E1.1.1 → E1.1.2 → E1.2.1 → E1.3.1          E6.1.1
    │                                    │                 │
    ▼                                    ▼                 ▼
Week 7-8: E1.1.3 → E1.1.4            E1.3.2 ◀────── E6.1.2
    │                                    │
    ▼                                    ▼
Week 9-10: E2.1.1 → E2.1.3 → E2.2.1 → E2.2.2
                                         │
    ┌────────────────────────────────────┘
    │
    ▼
Week 11-12: E3.1.1 → E3.1.2     E4.1.1 → E4.1.2
                │                         │
                ▼                         ▼
Week 13-14: E3.2.1 → E3.2.2     E4.1.3 → E4.2.1
                │                         │
                ▼                         ▼
Week 15-16: E3.3.1 → E3.3.2 → E3.3.3    E4.2.2 → E4.2.3
                                              │
                                              ▼
Week 17-18: Integration Testing          E4.3.1 → E4.3.2
                │
                ▼
Week 19-20: E3.4.1 → E3.4.2     E5.1.1 → E5.1.2
                │                         │
                ▼                         ▼
Week 21-22: E3.4.3              E5.1.3 → E5.2.1
                │
                ▼
Week 23-24: Production Hardening + Customer Acquisition
```

---

## Part 3: System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              SYSTEM ARCHITECTURE                                    │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  ┌──────────────────────────────────────────────────────────────────────────────┐   │
│  │                           DATA INGESTION LAYER                               │   │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐                 │   │
│  │  │  RSS Poller    │  │  Web Scraper   │  │  Telegram      │                 │   │
│  │  │  (Java)        │  │  (Python)      │  │  Monitor       │                 │   │
│  │  │                │  │                │  │  (Python)      │                 │   │
│  │  │  - 15 min      │  │  - Playwright  │  │  - Future      │                 │   │
│  │  │    interval    │  │  - Headless    │  │                │                 │   │
│  │  └───────┬────────┘  └───────┬────────┘  └───────┬────────┘                 │   │
│  │          │                   │                   │                           │   │
│  │          └───────────────────┼───────────────────┘                           │   │
│  │                              ▼                                               │   │
│  │                    ┌────────────────────┐                                    │   │
│  │                    │   Message Queue    │                                    │   │
│  │                    │   (Redis Streams)  │                                    │   │
│  │                    └─────────┬──────────┘                                    │   │
│  └──────────────────────────────┼───────────────────────────────────────────────┘   │
│                                 │                                                   │
│  ┌──────────────────────────────▼───────────────────────────────────────────────┐   │
│  │                         PROCESSING LAYER                                     │   │
│  │  ┌────────────────────────────────────────────────────────────────────────┐  │   │
│  │  │                    Content Processor (Java)                            │  │   │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │  │   │
│  │  │  │ Deduplicator │─▶│  Normalizer  │─▶│  Enricher    │                  │  │   │
│  │  │  │              │  │              │  │  - Language  │                  │  │   │
│  │  │  │ - URL hash   │  │ - HTML strip │  │  - Entities  │                  │  │   │
│  │  │  │ - Content    │  │ - Encoding   │  │  - Topics    │                  │  │   │
│  │  │  │   similarity │  │ - Whitespace │  │              │                  │  │   │
│  │  │  └──────────────┘  └──────────────┘  └──────┬───────┘                  │  │   │
│  │  └────────────────────────────────────────────┼───────────────────────────┘  │   │
│  │                                               │                              │   │
│  │  ┌────────────────────────────────────────────▼───────────────────────────┐  │   │
│  │  │                    AI Analysis Service (Python)                        │  │   │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │  │   │
│  │  │  │  LLM Client  │  │  Sentiment   │  │  Result      │                  │  │   │
│  │  │  │              │  │  Classifier  │  │  Aggregator  │                  │  │   │
│  │  │  │ - Claude API │  │              │  │              │                  │  │   │
│  │  │  │ - GPT-4 API  │  │ - Positive   │  │ - Confidence │                  │  │   │
│  │  │  │ - Retry      │  │ - Negative   │  │ - Caching    │                  │  │   │
│  │  │  │ - Fallback   │  │ - Neutral    │  │              │                  │  │   │
│  │  │  └──────────────┘  └──────────────┘  └──────────────┘                  │  │   │
│  │  └────────────────────────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────────────┘   │
│                                               │                                     │
│  ┌────────────────────────────────────────────▼──────────────────────────────────┐  │
│  │                              DATA LAYER                                       │  │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐  │  │
│  │  │                         PostgreSQL                                      │  │  │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │  │  │
│  │  │  │  articles   │  │  sources    │  │   users     │  │   topics    │    │  │  │
│  │  │  │             │  │             │  │             │  │             │    │  │  │
│  │  │  │ - id        │  │ - id        │  │ - id        │  │ - id        │    │  │  │
│  │  │  │ - source_id │  │ - name      │  │ - email     │  │ - user_id   │    │  │  │
│  │  │  │ - title     │  │ - url       │  │ - password  │  │ - keywords  │    │  │  │
│  │  │  │ - content   │  │ - type      │  │ - role      │  │ - sources   │    │  │  │
│  │  │  │ - sentiment │  │ - language  │  │ - org_id    │  │             │    │  │  │
│  │  │  │ - confidence│  │ - config    │  │             │  │             │    │  │  │
│  │  │  │ - published │  │             │  │             │  │             │    │  │  │
│  │  │  │ - metadata  │  │             │  │             │  │             │    │  │  │
│  │  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │  │  │
│  │  │                                                                         │  │  │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                     │  │  │
│  │  │  │   alerts    │  │   labels    │  │subscriptions│                     │  │  │
│  │  │  │             │  │             │  │             │                     │  │  │
│  │  │  │ - id        │  │ - id        │  │ - id        │                     │  │  │
│  │  │  │ - user_id   │  │ - article_id│  │ - user_id   │                     │  │  │
│  │  │  │ - topic_id  │  │ - label     │  │ - stripe_id │                     │  │  │
│  │  │  │ - condition │  │ - labeler   │  │ - plan      │                     │  │  │
│  │  │  │ - channel   │  │ - created   │  │ - status    │                     │  │  │
│  │  │  └─────────────┘  └─────────────┘  └─────────────┘                     │  │  │
│  │  └─────────────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                               │  │
│  │  ┌──────────────────────────────┐  ┌──────────────────────────────┐          │  │
│  │  │           Redis              │  │         S3/MinIO             │          │  │
│  │  │  - Session cache             │  │  - Raw HTML archive          │          │  │
│  │  │  - Rate limiting             │  │  - Labeled dataset export    │          │  │
│  │  │  - Job queues                │  │  - Report PDFs               │          │  │
│  │  │  - LLM response cache        │  │                              │          │  │
│  │  └──────────────────────────────┘  └──────────────────────────────┘          │  │
│  └───────────────────────────────────────────────────────────────────────────────┘  │
│                                               │                                     │
│  ┌────────────────────────────────────────────▼──────────────────────────────────┐  │
│  │                            API LAYER (Spring Boot)                            │  │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐  │  │
│  │  │                          REST Controllers                               │  │  │
│  │  │  /api/v1/articles    /api/v1/sentiment    /api/v1/topics               │  │  │
│  │  │  /api/v1/sources     /api/v1/alerts       /api/v1/users                │  │  │
│  │  └─────────────────────────────────────────────────────────────────────────┘  │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │  │
│  │  │  JWT Auth    │  │ Rate Limiter │  │  CORS       │  │  Metrics     │      │  │
│  │  │  Filter      │  │  Filter      │  │  Filter     │  │  Filter      │      │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘      │  │
│  └───────────────────────────────────────────────────────────────────────────────┘  │
│                                               │                                     │
│  ┌────────────────────────────────────────────▼──────────────────────────────────┐  │
│  │                           FRONTEND (React)                                    │  │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐  │  │
│  │  │  Components                                                             │  │  │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │  │  │
│  │  │  │Dashboard │ │ Articles │ │  Topics  │ │  Alerts  │ │ Settings │      │  │  │
│  │  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘      │  │  │
│  │  └─────────────────────────────────────────────────────────────────────────┘  │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                        │  │
│  │  │  Recharts    │  │  TanStack    │  │  React       │                        │  │
│  │  │  (Charts)    │  │  Query       │  │  Router      │                        │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                        │  │
│  └───────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Component Details

#### Data Ingestion Layer

**Technology Choices:**
- RSS Poller: Java (reuses Spring Boot scheduler)
- Web Scraper: Python + Playwright (better library ecosystem for scraping)
- Queue: Redis Streams (simple, no additional infrastructure)

**Design Decisions:**
- Separate scraper process from main application (isolation of failure modes)
- Store raw HTML in object storage (audit trail, reprocessing capability)
- 15-minute polling interval (balances freshness vs. resource usage)

```java
// Source configuration model
@Entity
public class Source {
    @Id
    private Long id;
    private String name;
    private String url;

    @Enumerated(EnumType.STRING)
    private SourceType type; // RSS, WEB_SCRAPE, TELEGRAM

    @Enumerated(EnumType.STRING)
    private Language language; // ARMENIAN, RUSSIAN, ENGLISH

    @Column(columnDefinition = "jsonb")
    private String config; // Type-specific configuration

    private boolean active;
    private Instant lastFetched;
    private Instant lastSuccess;
}
```

#### AI Analysis Layer

**LLM Integration Strategy:**

```python
# Prompt template for Armenian sentiment
ARMENIAN_SENTIMENT_PROMPT = """
Analyze the sentiment of this Armenian news article.

Article Title: {title}
Article Text: {content}

Classify the overall sentiment as:
- POSITIVE: Optimistic tone, good news, achievements, progress
- NEGATIVE: Critical tone, bad news, failures, problems, accusations
- NEUTRAL: Factual reporting without emotional tone

Also identify:
1. Primary topic (1-3 words)
2. Key entities mentioned (people, organizations)
3. Confidence level (HIGH, MEDIUM, LOW)

Respond in JSON format:
{{
  "sentiment": "POSITIVE|NEGATIVE|NEUTRAL",
  "confidence": "HIGH|MEDIUM|LOW",
  "topic": "string",
  "entities": ["string"],
  "reasoning": "Brief explanation in English"
}}
"""
```

**Cost Optimization:**

| Strategy | Implementation | Savings |
|----------|----------------|---------|
| Response caching | Cache by content hash (Redis, 24hr TTL) | 30-40% |
| Batch processing | Process 5-10 articles per API call | 20-30% |
| Tiered analysis | Full analysis for headline articles only | 40-50% |
| Model fallback | Use cheaper model for low-priority content | 30% |

#### Backend API Layer

**API Design Principles:**
- RESTful with consistent naming
- Pagination on all list endpoints
- Filtering via query parameters
- Rate limiting per API key

**Key Endpoints:**

```yaml
# OpenAPI excerpt
/api/v1/articles:
  get:
    parameters:
      - name: source_id
        in: query
        schema: { type: integer }
      - name: sentiment
        in: query
        schema: { type: string, enum: [POSITIVE, NEGATIVE, NEUTRAL] }
      - name: from_date
        in: query
        schema: { type: string, format: date-time }
      - name: to_date
        in: query
        schema: { type: string, format: date-time }
      - name: topic
        in: query
        schema: { type: string }
      - name: page
        in: query
        schema: { type: integer, default: 0 }
      - name: size
        in: query
        schema: { type: integer, default: 20, maximum: 100 }

/api/v1/sentiment/aggregate:
  get:
    parameters:
      - name: group_by
        in: query
        schema: { type: string, enum: [source, day, topic] }
      - name: from_date
        in: query
        required: true
      - name: to_date
        in: query
        required: true
```

#### Infrastructure

**Cloud Provider:** DigitalOcean or Hetzner (cost-effective for early stage)

**Production Environment:**

| Component | Specification | Monthly Cost |
|-----------|---------------|--------------|
| App Server | 2 vCPU, 4GB RAM | $24 |
| Database | Managed PostgreSQL, 1GB | $15 |
| Redis | Managed, 1GB | $15 |
| Object Storage | 100GB S3-compatible | $5 |
| Domain + SSL | Let's Encrypt | $0 |
| Monitoring | Uptime Robot + Sentry free tier | $0 |
| **Total** | | **~$60/month** |

**CI/CD Pipeline:**

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: ./gradlew test

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build Docker image
        run: docker build -t app:${{ github.sha }} .
      - name: Push to registry
        run: docker push registry/app:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        run: |
          ssh deploy@server "docker pull registry/app:${{ github.sha }} && docker-compose up -d"
```

---

## Part 4: MVP Scope Definition

### Mandatory (Must Ship)

| Feature | Rationale |
|---------|-----------|
| 10-15 Armenian news source ingestion | Core value proposition |
| Basic sentiment classification (3-class) | Minimum viable insight |
| Web dashboard with login | Users need to see data |
| Sentiment trend visualization | Primary use case |
| Article list with filters | Navigation requirement |
| Daily email digest | Delivers value without daily login |
| Topic/keyword tracking (3 per user) | Personalization hook |

### Postpone (Build When Demanded)

| Feature | Why Postpone | Build Trigger |
|---------|--------------|---------------|
| Russian source support | Focus on core Armenian first | First Russian-speaking customer |
| Telegram monitoring | Legal gray area, complex | Customer explicitly requires |
| API access | No developer market yet | First API customer request |
| Multi-user organizations | Solo users first | First org with 3+ users |
| Custom reports/PDF export | Nice-to-have | Customer requests during pilot |
| Entity extraction | Adds complexity | After sentiment accuracy validated |
| Mobile app | Web-first | >50% mobile traffic |

### Do Not Build

| Feature | Why Not |
|---------|---------|
| Disinformation detection | Different product; scope creep |
| Source credibility scoring | Politically contentious; requires editorial judgment |
| Automated fact-checking | Technically hard; liability risk |
| Social media monitoring | Different data model; API costs |
| Competitor comparison features | Complexity without clear demand |
| Real-time websocket updates | Over-engineering; polling sufficient |
| Multi-language UI | English-only MVP; add when 50%+ non-English users |
| White-label/reseller features | Enterprise feature; premature |

### MVP Feature Specifications

**Sentiment Dashboard**

```
┌─────────────────────────────────────────────────────────────────┐
│  News Sentiment Dashboard                    [Settings] [Logout]│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Date Range: [Last 7 Days ▼]    Sources: [All ▼]               │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 SENTIMENT TREND                          │   │
│  │     ▲                                                    │   │
│  │  60%│        ____                                        │   │
│  │     │       /    \      ___                              │   │
│  │  40%│______/      \____/   \____    ← Positive           │   │
│  │     │                           \                        │   │
│  │  20%│____________________________\__ ← Neutral           │   │
│  │     │                               \___                 │   │
│  │   0%│___________________________________ ← Negative      │   │
│  │     └────────────────────────────────────────────▶       │   │
│  │      Mon   Tue   Wed   Thu   Fri   Sat   Sun             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────┐  ┌─────────────────────────────┐  │
│  │ TOP TOPICS              │  │ SOURCE BREAKDOWN            │  │
│  │                         │  │                             │  │
│  │ 1. Elections (142)      │  │ news.am      ████████ 45%   │  │
│  │ 2. Economy (98)         │  │ civilnet.am  █████ 28%      │  │
│  │ 3. Russia (67)          │  │ hetq.am      ███ 15%        │  │
│  │ 4. Border (45)          │  │ azatutyun    ██ 12%         │  │
│  └─────────────────────────┘  └─────────────────────────────┘  │
│                                                                 │
│  RECENT ARTICLES                               [View All →]     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ● Government announces new economic measures   [+] news.am│   │
│  │ ● Opposition criticizes border policy          [-] hetq   │   │
│  │ ● Tech sector shows growth in Q4              [+] factor │   │
│  │ ● Weather forecast for the week               [○] 1lurer │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Part 5: Dataset Strategy

### Labeling Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    LABELING PIPELINE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐                                               │
│  │   Article    │                                               │
│  │   Ingested   │                                               │
│  └──────┬───────┘                                               │
│         │                                                       │
│         ▼                                                       │
│  ┌──────────────┐     ┌──────────────┐                         │
│  │  LLM Auto-   │────▶│   Label      │                         │
│  │  Label       │     │   Queue      │                         │
│  └──────────────┘     └──────┬───────┘                         │
│                              │                                  │
│         ┌────────────────────┼────────────────────┐            │
│         ▼                    ▼                    ▼            │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐   │
│  │  Random      │     │   Low        │     │   High       │   │
│  │  Sample      │     │  Confidence  │     │   Disagreement│   │
│  │  (5%)        │     │  (<0.7)      │     │   Cases      │   │
│  └──────┬───────┘     └──────┬───────┘     └──────┬───────┘   │
│         │                    │                    │            │
│         └────────────────────┼────────────────────┘            │
│                              ▼                                  │
│                    ┌──────────────────┐                        │
│                    │  Human Review    │                        │
│                    │  Interface       │                        │
│                    └────────┬─────────┘                        │
│                             │                                   │
│              ┌──────────────┼──────────────┐                   │
│              ▼              ▼              ▼                   │
│       ┌──────────┐   ┌──────────┐   ┌──────────┐              │
│       │ Confirm  │   │ Correct  │   │  Skip/   │              │
│       │ LLM      │   │ Label    │   │  Flag    │              │
│       └────┬─────┘   └────┬─────┘   └────┬─────┘              │
│            │              │              │                     │
│            └──────────────┼──────────────┘                     │
│                           ▼                                    │
│                  ┌────────────────┐                            │
│                  │  Gold Dataset  │                            │
│                  │  (Verified)    │                            │
│                  └────────────────┘                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Labeling Guidelines

**Sentiment Categories:**

| Label | Definition | Examples |
|-------|------------|----------|
| POSITIVE | Content conveys optimism, achievement, progress, or favorable outcomes | Economic growth, diplomatic success, awards, positive reforms |
| NEGATIVE | Content conveys criticism, problems, failures, or unfavorable outcomes | Corruption allegations, economic decline, conflict, accusations |
| NEUTRAL | Factual reporting without clear emotional valence | Weather, schedules, procedural announcements, balanced reporting |

**Edge Cases:**

| Scenario | Guidance |
|----------|----------|
| Mixed sentiment | Label based on dominant tone (>60% of content) |
| Sarcasm/irony | Label based on intended meaning, not literal |
| Quotes from others | Label based on framing, not quoted content |
| Headlines vs. body mismatch | Label based on full article, not headline alone |

### Labeling Tooling

**Internal Labeling Interface:**

```
┌─────────────────────────────────────────────────────────────────┐
│  Labeling Queue                              Progress: 23/50    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Source: news.am          Published: 2026-02-15 14:32          │
│  Language: Armenian       LLM Prediction: NEGATIVE (0.72)       │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Headline:                                                │   │
│  │ Delays Reported in Border Negotiations                   │   │
│  │                                                          │   │
│  │ Article:                                                 │   │
│  │ [Full article text displayed here with key phrases      │   │
│  │  highlighted by LLM reasoning...]                        │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Your Label:                                                    │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│  │POSITIVE │  │NEGATIVE │  │ NEUTRAL │  │  SKIP   │           │
│  │   (1)   │  │   (2)   │  │   (3)   │  │   (S)   │           │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘           │
│                                                                 │
│  Notes (optional): [________________________]                   │
│                                                                 │
│  [← Previous]                              [Next →]             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Quality Control

**Metrics to Track:**

| Metric | Target | Action if Below |
|--------|--------|-----------------|
| Inter-annotator agreement (Cohen's Kappa) | >0.7 | Review guidelines, training |
| LLM vs. human agreement | >0.8 | Improve prompts, add examples |
| Labeling throughput | 50/day | Simplify interface, batch similar items |
| Label distribution balance | No class <20% | Oversample minority class |

**Quality Assurance Process:**

1. **Calibration sessions:** Weekly review of 10 disagreement cases
2. **Spot checks:** Random 5% verification of all labels
3. **Drift monitoring:** Track agreement over time; investigate drops
4. **Difficult case log:** Document edge cases for guideline updates

### Dataset IP Protection

**Legal:**
- Terms of service: Users grant license for data created on platform
- Labeling agreements: Contractors assign IP to company
- Dataset license: Proprietary; not open-sourced

**Technical:**
- Database encryption at rest
- Access logging for all dataset queries
- No bulk export in user-facing product
- Watermarking for any shared samples (unique tokens)

**Versioning:**
- Git-style versioning for dataset releases
- Immutable snapshots for model training reproducibility
- Changelog for all schema/guideline changes

### Dataset Milestones

| Milestone | Size | Purpose | Target Date |
|-----------|------|---------|-------------|
| V0.1 | 500 samples | Initial accuracy baseline | Week 8 |
| V0.5 | 2,000 samples | Prompt optimization | Week 16 |
| V1.0 | 5,000 samples | Fine-tuning experiments | Week 24 |
| V2.0 | 10,000 samples | Production model training | Month 9 |

---

## Part 6: 6-Month Execution Timeline

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           6-MONTH EXECUTION TIMELINE                                │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  MONTH 1                                                                            │
│  ├── Week 1-2: Discovery & Validation                                               │
│  │   ├── Customer interviews (5-8 calls)                                            │
│  │   ├── LLM accuracy benchmarking                                                  │
│  │   └── Design partner negotiations                                                │
│  ├── Week 3: Technical Spike                                                        │
│  │   ├── End-to-end prototype (Jupyter)                                             │
│  │   ├── Data source audit                                                          │
│  │   └── Architecture decision records                                              │
│  └── Week 4: Foundation Setup                                                       │
│      ├── Cloud infrastructure provisioned                                           │
│      ├── CI/CD pipeline operational                                                 │
│      └── Development environment documented                                         │
│  ────────────────────────────────────────────────────────────────────────────────   │
│  MILESTONE: Design partner signed, technical feasibility confirmed                  │
│                                                                                     │
│  MONTH 2                                                                            │
│  ├── Week 5-6: Data Ingestion                                                       │
│  │   ├── RSS fetcher implemented                                                    │
│  │   ├── 5 Armenian source scrapers                                                 │
│  │   ├── PostgreSQL schema v1                                                       │
│  │   └── Deduplication logic                                                        │
│  └── Week 7-8: Sentiment Pipeline                                                   │
│      ├── LLM integration (Claude + GPT fallback)                                    │
│      ├── Sentiment classification service                                           │
│      ├── Response caching                                                           │
│      └── Initial labeled dataset (500 samples)                                      │
│  ────────────────────────────────────────────────────────────────────────────────   │
│  MILESTONE: Pipeline processing 100+ articles/day with sentiment                    │
│                                                                                     │
│  MONTH 3                                                                            │
│  ├── Week 9-10: Expand Sources + Stability                                          │
│  │   ├── 5 additional scrapers (10 total)                                           │
│  │   ├── Error handling and retry logic                                             │
│  │   ├── Health monitoring alerts                                                   │
│  │   └── Pipeline uptime >95%                                                       │
│  └── Week 11-12: Backend APIs                                                       │
│      ├── JWT authentication                                                         │
│      ├── Articles query API                                                         │
│      ├── Sentiment aggregation API                                                  │
│      └── API documentation                                                          │
│  ────────────────────────────────────────────────────────────────────────────────   │
│  MILESTONE: Backend APIs ready for frontend integration                             │
│                                                                                     │
│  MONTH 4                                                                            │
│  ├── Week 13-14: Frontend Core                                                      │
│  │   ├── React project setup                                                        │
│  │   ├── Auth flow (login/register)                                                 │
│  │   ├── Dashboard layout                                                           │
│  │   └── Sentiment trend chart                                                      │
│  └── Week 15-16: Frontend Features                                                  │
│      ├── Article list with filters                                                  │
│      ├── Source breakdown view                                                      │
│      ├── Topic tracking UI                                                          │
│      └── Design partner preview access                                              │
│  ────────────────────────────────────────────────────────────────────────────────   │
│  MILESTONE: Design partner using dashboard daily                                    │
│                                                                                     │
│  MONTH 5                                                                            │
│  ├── Week 17-18: Alerts + Polish                                                    │
│  │   ├── Alert configuration UI                                                     │
│  │   ├── Email notification service                                                 │
│  │   ├── Daily digest emails                                                        │
│  │   └── UI/UX improvements from feedback                                           │
│  └── Week 19-20: Monetization                                                       │
│      ├── Stripe integration                                                         │
│      ├── Subscription management                                                    │
│      ├── Usage metering                                                             │
│      └── Pricing page                                                               │
│  ────────────────────────────────────────────────────────────────────────────────   │
│  MILESTONE: Payment processing live, first paying customer                          │
│                                                                                     │
│  MONTH 6                                                                            │
│  ├── Week 21-22: Labeling + Quality                                                 │
│  │   ├── Internal labeling interface                                                │
│  │   ├── 2,000 labeled samples                                                      │
│  │   ├── Accuracy tracking dashboard                                                │
│  │   └── Production hardening                                                       │
│  └── Week 23-24: Launch + Acquisition                                               │
│      ├── 5 additional sources (15 total)                                            │
│      ├── Customer acquisition outreach                                              │
│      ├── Documentation and onboarding                                               │
│      └── 3+ paying customers                                                        │
│  ────────────────────────────────────────────────────────────────────────────────   │
│  MILESTONE: MVP complete, 3+ paying customers, $1K+ MRR                             │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Key Milestones Summary

| Week | Milestone | Success Criteria | Risk Level |
|------|-----------|------------------|------------|
| 3 | Discovery Complete | 1 design partner signed | Medium |
| 8 | Pipeline Operational | 100+ articles/day processed | Low |
| 12 | APIs Ready | All endpoints documented and tested | Low |
| 16 | Dashboard Live | Design partner using daily | Medium |
| 20 | Payments Live | First payment processed | Low |
| 24 | MVP Complete | 3+ paying customers, $1K MRR | High |

---

## Part 7: Weekly Operating Cadence

### Solo Founder Weekly Schedule

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                        WEEKLY OPERATING CADENCE                                     │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  MONDAY: Planning & Priorities                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │ 08:00-09:00  Review metrics dashboard (pipeline health, user activity)      │   │
│  │ 09:00-10:00  Weekly planning: select 3-5 tasks from backlog                 │   │
│  │ 10:00-12:00  Deep work block #1 (highest priority task)                     │   │
│  │ 12:00-13:00  Lunch + industry reading                                       │   │
│  │ 13:00-17:00  Deep work block #2 (development)                               │   │
│  │ 17:00-17:30  End-of-day commit, update task board                           │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                     │
│  TUESDAY-THURSDAY: Execution Days                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │ 08:00-08:30  Check alerts, respond to critical issues                       │   │
│  │ 08:30-12:00  Deep work block (3.5 hours uninterrupted)                      │   │
│  │ 12:00-13:00  Lunch                                                          │   │
│  │ 13:00-14:00  Customer calls / email responses (batched)                     │   │
│  │ 14:00-17:00  Deep work block #2                                             │   │
│  │ 17:00-17:30  Code review, documentation, commit                             │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                     │
│  FRIDAY: Review & Outreach                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │ 08:00-10:00  Week review: what shipped, what blocked                        │   │
│  │ 10:00-12:00  Labeling session (50 samples)                                  │   │
│  │ 12:00-13:00  Lunch                                                          │   │
│  │ 13:00-15:00  Customer outreach / sales (2-3 cold emails)                    │   │
│  │ 15:00-16:00  Backlog grooming, next week preparation                        │   │
│  │ 16:00-17:00  Learning time (papers, tools, competitors)                     │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                     │
│  WEEKEND: Optional & Recovery                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │ Saturday: OFF (critical for sustainability)                                 │   │
│  │ Sunday (optional, 2-4 hours):                                               │   │
│  │   - Side exploration / experimentation                                      │   │
│  │   - Reading / learning                                                      │   │
│  │   - Light labeling if behind                                                │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Time Allocation Guidelines

| Activity | Target % | Hours/Week | Notes |
|----------|----------|------------|-------|
| Development | 60% | 24-30 | Protect deep work blocks |
| Customer/Sales | 15% | 6-8 | Batch calls; never skip |
| Operations/Monitoring | 10% | 4-5 | Automate aggressively |
| Labeling | 10% | 4-5 | Friday dedicated session |
| Planning/Admin | 5% | 2-3 | Monday morning only |

### Weekly Rituals

**Monday Morning (30 min):**
- Review: What shipped last week?
- Metrics: Pipeline uptime, articles processed, active users
- Priorities: What are the 3 most important tasks this week?

**Friday Afternoon (30 min):**
- Demo: Record 2-minute video of what shipped (even if no audience)
- Retrospective: One thing that went well, one to improve
- Backlog: Groom top 10 tasks for next week

### Operational Checklists

**Daily (5 min):**
- [ ] Check pipeline health dashboard
- [ ] Review any alerts/errors from overnight
- [ ] Scan customer support queue

**Weekly (Friday):**
- [ ] Pipeline uptime report
- [ ] New articles processed count
- [ ] Active users / engagement metrics
- [ ] LLM API costs to date
- [ ] Labeling progress vs. target

**Monthly:**
- [ ] MRR and customer count
- [ ] Burn rate and runway
- [ ] Feature velocity (stories completed)
- [ ] Technical debt assessment
- [ ] Competitive landscape scan

### Tools for Solo Founder

| Purpose | Recommended Tool | Why |
|---------|------------------|-----|
| Task Management | Linear (free tier) or GitHub Projects | Simple, keyboard-driven |
| Time Tracking | Toggl (optional) | Understand time allocation |
| Documentation | Notion or Markdown in repo | Searchable, versionable |
| Customer CRM | Spreadsheet or Attio free | Don't over-engineer early |
| Monitoring | Uptime Robot + Sentry free | Sufficient for MVP |
| Analytics | PostHog free tier | Privacy-friendly, self-hostable |

---

## Part 8: Trade-offs and Decision Log

### Key Trade-offs Made

| Decision | Alternative Considered | Rationale |
|----------|------------------------|-----------|
| Monolith over microservices | Separate services per concern | Solo founder; deployment simplicity; extract later |
| LLM API over custom model | Train model from scratch | Faster time-to-market; model later with labeled data |
| PostgreSQL over specialized DB | Elasticsearch, ClickHouse | Familiar, sufficient for MVP scale, full-text search adequate |
| DigitalOcean over AWS/GCP | Major cloud providers | Cost; simplicity; sufficient for scale |
| Spring Boot over Node.js | JavaScript full-stack | Founder strength; type safety; better for complex business logic |
| Stripe over local payment | Armenian payment processors | International customers; familiar API |
| RSS-first over scraping | Full scraping | Lower maintenance; legal clarity |

### Risks Accepted

| Risk | Probability | Impact | Acceptance Rationale |
|------|-------------|--------|----------------------|
| LLM API price increases | Medium | High | Build labeled data to enable model switch |
| Single point of failure (founder) | High | Critical | Mitigate with documentation; accept for MVP |
| News site blocking scrapers | Medium | Medium | RSS fallback; relationship building |
| Slow customer acquisition | Medium | High | Start outreach early; parallel to development |

### Decision Log Template

```markdown
## Decision: [Title]
**Date:** YYYY-MM-DD
**Status:** Proposed / Accepted / Superseded

### Context
What is the issue we're addressing?

### Options Considered
1. Option A - pros/cons
2. Option B - pros/cons
3. Option C - pros/cons

### Decision
What was decided and why?

### Consequences
What are the implications? What do we need to watch for?
```

---

## Appendix A: Database Schema

```sql
-- Core tables
CREATE TABLE sources (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL,
    type VARCHAR(50) NOT NULL, -- RSS, WEB_SCRAPE, TELEGRAM
    language VARCHAR(20) NOT NULL, -- ARMENIAN, RUSSIAN, ENGLISH
    config JSONB,
    active BOOLEAN DEFAULT true,
    last_fetched TIMESTAMPTZ,
    last_success TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE articles (
    id BIGSERIAL PRIMARY KEY,
    source_id BIGINT REFERENCES sources(id),
    external_id VARCHAR(500), -- URL or unique ID from source
    title TEXT NOT NULL,
    content TEXT,
    url VARCHAR(500),
    author VARCHAR(255),
    published_at TIMESTAMPTZ,
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    content_hash VARCHAR(64), -- For deduplication
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(source_id, external_id)
);

CREATE TABLE sentiment_results (
    id BIGSERIAL PRIMARY KEY,
    article_id BIGINT REFERENCES articles(id),
    sentiment VARCHAR(20) NOT NULL, -- POSITIVE, NEGATIVE, NEUTRAL
    confidence DECIMAL(3,2),
    model_version VARCHAR(50),
    reasoning TEXT,
    topics TEXT[],
    entities JSONB,
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(article_id, model_version)
);

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'USER',
    organization_id BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ
);

CREATE TABLE topics (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    keywords TEXT[] NOT NULL,
    source_ids BIGINT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE alerts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    topic_id BIGINT REFERENCES topics(id),
    condition JSONB NOT NULL, -- {type: "spike", threshold: 0.2}
    channel VARCHAR(50) NOT NULL, -- EMAIL, WEBHOOK
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE labels (
    id BIGSERIAL PRIMARY KEY,
    article_id BIGINT REFERENCES articles(id),
    labeler_id BIGINT REFERENCES users(id),
    sentiment VARCHAR(20) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(article_id, labeler_id)
);

CREATE TABLE subscriptions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    plan VARCHAR(50),
    status VARCHAR(50),
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_articles_source_published ON articles(source_id, published_at DESC);
CREATE INDEX idx_articles_content_hash ON articles(content_hash);
CREATE INDEX idx_sentiment_article ON sentiment_results(article_id);
CREATE INDEX idx_sentiment_processed ON sentiment_results(processed_at DESC);
CREATE INDEX idx_topics_user ON topics(user_id);

-- Full-text search
ALTER TABLE articles ADD COLUMN search_vector tsvector;
CREATE INDEX idx_articles_search ON articles USING GIN(search_vector);

CREATE OR REPLACE FUNCTION articles_search_trigger() RETURNS trigger AS $$
BEGIN
    NEW.search_vector := to_tsvector('simple', COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.content, ''));
    RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER articles_search_update
    BEFORE INSERT OR UPDATE ON articles
    FOR EACH ROW EXECUTE FUNCTION articles_search_trigger();
```

---

## Appendix B: API Specification (Key Endpoints)

```yaml
openapi: 3.0.0
info:
  title: News Sentiment API
  version: 1.0.0

paths:
  /api/v1/auth/login:
    post:
      summary: Authenticate user
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                email: { type: string }
                password: { type: string }
      responses:
        200:
          description: JWT token
          content:
            application/json:
              schema:
                type: object
                properties:
                  token: { type: string }
                  expiresIn: { type: integer }

  /api/v1/articles:
    get:
      summary: List articles with filters
      parameters:
        - name: source_id
          in: query
          schema: { type: integer }
        - name: sentiment
          in: query
          schema: { type: string, enum: [POSITIVE, NEGATIVE, NEUTRAL] }
        - name: from
          in: query
          schema: { type: string, format: date-time }
        - name: to
          in: query
          schema: { type: string, format: date-time }
        - name: q
          in: query
          description: Full-text search
          schema: { type: string }
        - name: page
          in: query
          schema: { type: integer, default: 0 }
        - name: size
          in: query
          schema: { type: integer, default: 20 }
      responses:
        200:
          description: Paginated article list
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ArticlePage'

  /api/v1/sentiment/aggregate:
    get:
      summary: Aggregated sentiment statistics
      parameters:
        - name: groupBy
          in: query
          required: true
          schema: { type: string, enum: [day, source, topic] }
        - name: from
          in: query
          required: true
          schema: { type: string, format: date-time }
        - name: to
          in: query
          required: true
          schema: { type: string, format: date-time }
        - name: sourceIds
          in: query
          schema: { type: array, items: { type: integer } }
      responses:
        200:
          description: Aggregated sentiment data
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/SentimentAggregate'

  /api/v1/topics:
    get:
      summary: List user's topics
      responses:
        200:
          description: Topic list
    post:
      summary: Create new topic
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/TopicCreate'

  /api/v1/alerts:
    get:
      summary: List user's alerts
    post:
      summary: Create new alert
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AlertCreate'

components:
  schemas:
    Article:
      type: object
      properties:
        id: { type: integer }
        title: { type: string }
        url: { type: string }
        source: { $ref: '#/components/schemas/Source' }
        sentiment: { type: string }
        confidence: { type: number }
        publishedAt: { type: string, format: date-time }

    ArticlePage:
      type: object
      properties:
        content: { type: array, items: { $ref: '#/components/schemas/Article' } }
        totalElements: { type: integer }
        totalPages: { type: integer }

    SentimentAggregate:
      type: object
      properties:
        group: { type: string }
        positive: { type: integer }
        negative: { type: integer }
        neutral: { type: integer }
        total: { type: integer }

    TopicCreate:
      type: object
      properties:
        name: { type: string }
        keywords: { type: array, items: { type: string } }
        sourceIds: { type: array, items: { type: integer } }

    AlertCreate:
      type: object
      properties:
        topicId: { type: integer }
        condition:
          type: object
          properties:
            type: { type: string, enum: [spike, threshold] }
            value: { type: number }
        channel: { type: string, enum: [EMAIL] }
```

---

## Appendix C: Cost Projections

### Monthly Operating Costs (MVP)

| Item | Cost | Notes |
|------|------|-------|
| Cloud Infrastructure | $60 | DO/Hetzner basic setup |
| LLM API (Claude/OpenAI) | $50-150 | ~200 articles/day, with caching |
| Domain + Email | $10 | Cloudflare + transactional email |
| Monitoring | $0 | Free tiers sufficient |
| **Total** | **$120-220/month** | |

### Break-even Analysis

| Scenario | MRR Needed | Customers (at $100/mo) |
|----------|------------|------------------------|
| Cover costs | $220 | 3 |
| Cover costs + min wage | $2,500 | 25 |
| Sustainable solo business | $5,000 | 50 |

### LLM Cost Modeling

```
Daily articles: 200
Average tokens per article: 2,000 (input) + 200 (output)

Claude Sonnet pricing (Feb 2026):
- Input: $3/1M tokens
- Output: $15/1M tokens

Daily cost without caching:
- Input: 200 * 2,000 * $3/1M = $1.20
- Output: 200 * 200 * $15/1M = $0.60
- Total: $1.80/day = $54/month

With 40% cache hit rate:
- Effective cost: $54 * 0.6 = $32/month
```

---

*This execution plan is designed to be a living document. Update it weekly as you learn from customers and the market.*
