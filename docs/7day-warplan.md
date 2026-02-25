# AIIM 7-Day Wartime Execution Plan

## Executive Summary

**Mission:** Transform existing codebase into a demo-ready, sellable product in 7 days.

**Success Criteria:**
- Live demo environment with real Armenian data
- 3 pilot meetings booked by Day 10
- 1 grant concept note submitted by Day 14
- Sales deck and materials complete

**Reality Check:** You have ~70-84 working hours. Every hour must count.

---

# Part 1: 20-Phase Execution Map

## Phase 1: War Room Setup
**Objective:** Eliminate all friction from development workflow

**Technical Tasks:**
- [ ] Set up single-command deployment script
- [ ] Create `.env.demo` with all credentials
- [ ] Set up error monitoring (Sentry free tier)
- [ ] Create database seed script with demo data

**Business Tasks:**
- [ ] Block calendar for 7 days
- [ ] Set up focused communication (disable notifications)
- [ ] Prepare contact list for Day 6-7 outreach

**Deliverables:**
- `./deploy.sh` - one command deployment
- `./seed-demo.sh` - demo data population
- Working local + remote environments

**Validation Criteria:**
- Fresh deploy from zero to running in < 10 minutes
- Demo data loads in < 2 minutes

---

## Phase 2: Brand Transformation
**Objective:** Rebrand from "News Sentiment Analysis" to "AIIM"

**Technical Tasks:**
- [ ] Update all UI text to AIIM branding
- [ ] Replace logo/favicon
- [ ] Update page titles and meta descriptions
- [ ] Update email templates (if any)

**Business Tasks:**
- [ ] Create AIIM logo (simple text-based, Canva)
- [ ] Define color palette (blue/gold for trust/Armenia)
- [ ] Write tagline: "Protecting Armenia's Information Space"

**Deliverables:**
- Rebranded application
- Logo files (PNG, SVG)
- Brand guidelines (1 page)

**Validation Criteria:**
- No reference to "News Sentiment" anywhere visible
- Professional, institutional appearance

---

## Phase 3: Telegram Data Pipeline
**Objective:** Ingest Telegram channel data (THE critical differentiator)

**Technical Tasks:**
- [ ] Set up Telethon client with API credentials
- [ ] Create channel discovery list (top 50 Armenian news/politics channels)
- [ ] Build message ingestion pipeline
- [ ] Store in PostgreSQL with same schema as articles

**Business Tasks:**
- [ ] Research top Armenian Telegram channels
- [ ] Categorize: news, political, commentary, suspicious

**Deliverables:**
- Working Telegram scraper
- 50+ channels configured
- 1000+ messages ingested

**Validation Criteria:**
- New Telegram posts appear within 30 minutes
- Channel metadata captured (subscribers, post frequency)

---

## Phase 4: Unified Content Model
**Objective:** Normalize all content sources into single queryable format

**Technical Tasks:**
- [ ] Create unified `content_items` view/table
- [ ] Add `source_type` enum (NEWS, TELEGRAM, SOCIAL)
- [ ] Ensure consistent fields: title, content, source, timestamp, url
- [ ] Update API to query unified model

**Business Tasks:**
- None

**Deliverables:**
- Single API endpoint for all content
- Consistent data model documentation

**Validation Criteria:**
- News and Telegram content queryable through same endpoint
- Filtering by source type works

---

## Phase 5: Narrative Detection (Simplified)
**Objective:** Group related content into trackable narratives

**Technical Tasks:**
- [ ] Implement keyword-based narrative detection (not ML)
- [ ] Create `narratives` table with keywords, first_seen, status
- [ ] Build narrative assignment logic on content ingest
- [ ] Create API endpoint for narrative listing

**Business Tasks:**
- [ ] Pre-define 10-15 election-relevant narratives
- [ ] Research current Armenian disinformation narratives

**Deliverables:**
- Narrative tracking system
- Pre-seeded narratives for demo

**Validation Criteria:**
- Content automatically assigned to narratives
- Narrative page shows grouped content

---

## Phase 6: Alert System
**Objective:** Demonstrate "early warning" capability

**Technical Tasks:**
- [ ] Create `alerts` table with threshold rules
- [ ] Implement spike detection (simple: >3x average in 1 hour)
- [ ] Build alert generation on content ingest
- [ ] Create alerts API and UI page

**Business Tasks:**
- [ ] Define demo alert scenarios

**Deliverables:**
- Alert generation system
- Alert management UI
- Email notification (optional, can mock)

**Validation Criteria:**
- Alerts appear when narrative volume spikes
- Alert dashboard shows severity, narrative, timestamp

---

## Phase 7: Election Dashboard
**Objective:** Create compelling election-focused visualization

**Technical Tasks:**
- [ ] Build dedicated `/election` route
- [ ] Create timeline component showing narrative activity over time
- [ ] Add key metrics cards (active narratives, alerts today, sources monitored)
- [ ] Implement geographic heatmap (can be static/demo)

**Business Tasks:**
- [ ] Define key election monitoring metrics
- [ ] Create compelling demo scenario

**Deliverables:**
- Election monitoring dashboard
- Real-time-feeling updates (30s polling)

**Validation Criteria:**
- Dashboard tells a story at a glance
- Donor can understand value in 30 seconds

---

## Phase 8: Reporting Module - Core
**Objective:** Enable PDF/Excel export of monitoring data

**Technical Tasks:**
- [ ] Add `react-pdf` or server-side PDF generation
- [ ] Create report template with AIIM branding
- [ ] Implement date range selection
- [ ] Add narrative/topic filtering for reports

**Business Tasks:**
- [ ] Design report template matching donor expectations

**Deliverables:**
- PDF export functionality
- Excel export functionality
- Branded report templates

**Validation Criteria:**
- One-click report generation
- Report looks professional enough for donor submission

---

## Phase 9: Reporting Module - Donor Templates
**Objective:** Pre-built templates matching donor reporting requirements

**Technical Tasks:**
- [ ] Create "Weekly Summary" template
- [ ] Create "Incident Report" template
- [ ] Create "Monthly Metrics" template
- [ ] Add template selection UI

**Business Tasks:**
- [ ] Research EU logframe reporting format
- [ ] Identify key metrics donors need

**Deliverables:**
- 3 report templates
- Template preview functionality

**Validation Criteria:**
- Templates contain donor-relevant sections
- Metrics auto-populated from system data

---

## Phase 10: Source Management UI
**Objective:** Allow users to manage monitored sources

**Technical Tasks:**
- [ ] Create sources management page
- [ ] Add/edit/disable source functionality
- [ ] Show source health status (last fetch, error count)
- [ ] Categorize sources by type and credibility

**Business Tasks:**
- [ ] Categorize demo sources by type

**Deliverables:**
- Source management interface
- Source health monitoring

**Validation Criteria:**
- User can add new source in < 1 minute
- Source status clearly visible

---

## Phase 11: Armenian Language Display
**Objective:** Properly render and search Armenian text

**Technical Tasks:**
- [ ] Ensure UTF-8 throughout stack
- [ ] Add Armenian font support in UI
- [ ] Implement Armenian text search
- [ ] Add language detection on ingest

**Business Tasks:**
- None

**Deliverables:**
- Armenian content displays correctly
- Search works with Armenian text

**Validation Criteria:**
- No character encoding issues
- Demo with Armenian content looks professional

---

## Phase 12: Demo Data Curation
**Objective:** Create compelling, realistic demo dataset

**Technical Tasks:**
- [ ] Script to generate realistic historical data
- [ ] Create "demo mode" flag hiding test data
- [ ] Implement demo scenario: election disinformation spike

**Business Tasks:**
- [ ] Write demo narrative arc
- [ ] Select real examples (anonymized if needed)

**Deliverables:**
- 7 days of realistic demo data
- 3 demo narratives with full lifecycle
- 5 triggered alerts in demo period

**Validation Criteria:**
- Demo data tells compelling story
- No obviously fake content visible

---

## Phase 13: User Roles & Permissions
**Objective:** Demonstrate multi-stakeholder access model

**Technical Tasks:**
- [ ] Add role field to user model (ADMIN, ANALYST, VIEWER)
- [ ] Implement basic permission checks
- [ ] Create role-appropriate UI variations

**Business Tasks:**
- [ ] Define role personas for demo

**Deliverables:**
- 3 user roles implemented
- Demo accounts for each role

**Validation Criteria:**
- Can demo different user perspectives
- Permissions visibly enforced

---

## Phase 14: Performance & Stability
**Objective:** Ensure demo doesn't crash

**Technical Tasks:**
- [ ] Add pagination everywhere
- [ ] Implement query optimization (indexes)
- [ ] Add request timeout handling
- [ ] Create health check endpoint

**Business Tasks:**
- None

**Deliverables:**
- Stable application under demo load
- Health monitoring endpoint

**Validation Criteria:**
- No page takes > 3 seconds
- No crashes during 30-minute session

---

## Phase 15: Deployment & Infrastructure
**Objective:** Reliable cloud deployment for demos

**Technical Tasks:**
- [ ] Deploy to Railway/Render/DigitalOcean
- [ ] Set up SSL certificate
- [ ] Configure production database
- [ ] Set up basic monitoring

**Business Tasks:**
- [ ] Register domain: aiim.am or aiim-armenia.org

**Deliverables:**
- Live URL with SSL
- Deployment documentation

**Validation Criteria:**
- Site accessible from anywhere
- No obvious infrastructure issues

---

## Phase 16: Demo Script & Training
**Objective:** Prepare flawless demo execution

**Technical Tasks:**
- [ ] Create demo reset script
- [ ] Pre-stage demo scenarios
- [ ] Test full demo flow 3x

**Business Tasks:**
- [ ] Write 15-minute demo script
- [ ] Prepare answers to likely questions
- [ ] Record backup video demo

**Deliverables:**
- Demo script document
- FAQ document
- Video walkthrough (backup)

**Validation Criteria:**
- Can deliver demo without technical issues
- Demo tells compelling election story

---

## Phase 17: Sales Collateral
**Objective:** Professional materials for donor meetings

**Technical Tasks:**
- None

**Business Tasks:**
- [ ] Create 2-page product brief
- [ ] Create 10-slide pitch deck
- [ ] Write capability statement
- [ ] Prepare pricing framework

**Deliverables:**
- Product brief PDF
- Pitch deck
- Capability statement
- One-pager

**Validation Criteria:**
- Materials look professional
- Clear value proposition

---

## Phase 18: Partner Outreach Prep
**Objective:** Prepare for CSO partner conversations

**Technical Tasks:**
- [ ] Set up pilot onboarding flow
- [ ] Create partner documentation

**Business Tasks:**
- [ ] Draft partnership proposal template
- [ ] Prepare pilot offer terms
- [ ] Research contact persons at target CSOs

**Deliverables:**
- Partner proposal template
- Pilot terms document
- Contact list with intros strategy

**Validation Criteria:**
- Ready to send partnership request
- Clear pilot value proposition

---

## Phase 19: Grant Alignment
**Objective:** Prepare grant application materials

**Technical Tasks:**
- [ ] Document technical specifications for proposals
- [ ] Prepare architecture diagram
- [ ] Create metrics framework document

**Business Tasks:**
- [ ] Draft concept note for EU4Democracy
- [ ] Identify open grant opportunities
- [ ] Prepare budget template

**Deliverables:**
- Technical specifications document
- Concept note draft
- Budget framework

**Validation Criteria:**
- Can respond to grant opportunity within 48 hours
- Materials match donor language

---

## Phase 20: Launch Readiness
**Objective:** Final checks and go-live

**Technical Tasks:**
- [ ] Security checklist review
- [ ] Backup configuration
- [ ] Monitoring alerts configured
- [ ] Rollback plan documented

**Business Tasks:**
- [ ] Brief any supporters/advisors
- [ ] Prepare launch announcement
- [ ] Schedule first outreach

**Deliverables:**
- Production-ready system
- Launch checklist completed
- First meetings scheduled

**Validation Criteria:**
- System stable for 24 hours
- 3 meetings scheduled within 7 days

---

# Part 2: 7-Day War Plan

## Day 1: Foundation & Telegram (Monday)
**Theme:** "Get the critical data pipeline working"

### Morning Block (4 hours: 6:00-10:00)
| Time | Task | Deliverable |
|------|------|-------------|
| 6:00-7:00 | Phase 1: War room setup | Deploy scripts working |
| 7:00-8:00 | Phase 2: Brand transformation | AIIM branding applied |
| 8:00-10:00 | Phase 3: Telegram setup | Telethon client authenticated |

### Coding Block (5 hours: 10:00-15:00)
| Time | Task | Deliverable |
|------|------|-------------|
| 10:00-12:00 | Phase 3: Telegram ingestion pipeline | Channel scraper working |
| 12:00-13:00 | Research: Armenian Telegram channels | 50 channel list |
| 13:00-15:00 | Phase 3: Telegram data storage | Messages in database |

### Evening Block (3 hours: 15:00-18:00)
| Time | Task | Deliverable |
|------|------|-------------|
| 15:00-16:30 | Phase 4: Unified content model | Single content API |
| 16:30-18:00 | Phase 11: Armenian language display | UTF-8 working |

### End-of-Day Deliverables:
- [ ] AIIM branding live
- [ ] Telegram channels being scraped
- [ ] 500+ messages ingested
- [ ] Unified content API working
- [ ] Armenian text displaying correctly

### Technical Debt Accepted:
- Hardcoded channel list
- No error recovery on Telegram scraper
- Manual channel discovery

---

## Day 2: Narratives & Alerts (Tuesday)
**Theme:** "Build the intelligence layer"

### Morning Block (4 hours: 6:00-10:00)
| Time | Task | Deliverable |
|------|------|-------------|
| 6:00-8:00 | Phase 5: Narrative detection logic | Keyword matcher working |
| 8:00-10:00 | Phase 5: Narrative database + API | Narratives queryable |

### Coding Block (5 hours: 10:00-15:00)
| Time | Task | Deliverable |
|------|------|-------------|
| 10:00-11:30 | Phase 5: Narrative assignment on ingest | Auto-categorization working |
| 11:30-13:00 | Phase 5: Narrative UI page | Narrative list + detail views |
| 13:00-15:00 | Phase 6: Alert system core | Spike detection working |

### Evening Block (3 hours: 15:00-18:00)
| Time | Task | Deliverable |
|------|------|-------------|
| 15:00-16:30 | Phase 6: Alert UI | Alert dashboard |
| 16:30-18:00 | Pre-define demo narratives | 10 narratives seeded |

### End-of-Day Deliverables:
- [ ] Narrative tracking functional
- [ ] Content auto-assigned to narratives
- [ ] Alert system generating alerts
- [ ] Alert dashboard visible
- [ ] 10 demo narratives configured

### Technical Debt Accepted:
- Keyword-only detection (no ML)
- Simple threshold alerts (no ML)
- No alert deduplication

---

## Day 3: Election Dashboard & Visualization (Wednesday)
**Theme:** "Make it visually compelling"

### Morning Block (4 hours: 6:00-10:00)
| Time | Task | Deliverable |
|------|------|-------------|
| 6:00-8:00 | Phase 7: Election dashboard layout | Dashboard structure |
| 8:00-10:00 | Phase 7: Timeline component | Narrative timeline working |

### Coding Block (5 hours: 10:00-15:00)
| Time | Task | Deliverable |
|------|------|-------------|
| 10:00-12:00 | Phase 7: Metrics cards | Key stats displayed |
| 12:00-14:00 | Phase 7: Interactive filtering | Dashboard filters working |
| 14:00-15:00 | Phase 12: Demo data curation start | Historical data script |

### Evening Block (3 hours: 15:00-18:00)
| Time | Task | Deliverable |
|------|------|-------------|
| 15:00-17:00 | Phase 12: Demo scenario creation | 7-day story arc |
| 17:00-18:00 | Phase 14: Performance basics | Pagination + indexes |

### End-of-Day Deliverables:
- [ ] Election dashboard functional
- [ ] Timeline visualization working
- [ ] Key metrics visible
- [ ] Demo data generating
- [ ] No major performance issues

### Technical Debt Accepted:
- Static geographic map (no real geo-coding)
- Polling instead of real-time
- Limited chart interactivity

---

## Day 4: Reporting & Export (Thursday)
**Theme:** "Enable donor deliverables"

### Morning Block (4 hours: 6:00-10:00)
| Time | Task | Deliverable |
|------|------|-------------|
| 6:00-8:00 | Phase 8: PDF generation setup | PDF library integrated |
| 8:00-10:00 | Phase 8: Report template design | Branded template |

### Coding Block (5 hours: 10:00-15:00)
| Time | Task | Deliverable |
|------|------|-------------|
| 10:00-12:00 | Phase 8: Date range + filtering | Report configuration UI |
| 12:00-14:00 | Phase 8: PDF export implementation | PDF download working |
| 14:00-15:00 | Phase 8: Excel export | Excel download working |

### Evening Block (3 hours: 15:00-18:00)
| Time | Task | Deliverable |
|------|------|-------------|
| 15:00-17:00 | Phase 9: Donor templates | 3 templates created |
| 17:00-18:00 | Phase 10: Source management UI | Sources page |

### End-of-Day Deliverables:
- [ ] PDF reports generating
- [ ] Excel export working
- [ ] 3 donor templates available
- [ ] Source management functional
- [ ] Reports look professional

### Technical Debt Accepted:
- Basic PDF styling (not perfect)
- Limited template customization
- No scheduled reports

---

## Day 5: Stability & Deployment (Friday)
**Theme:** "Make it production-ready"

### Morning Block (4 hours: 6:00-10:00)
| Time | Task | Deliverable |
|------|------|-------------|
| 6:00-8:00 | Phase 13: User roles | 3 roles implemented |
| 8:00-10:00 | Phase 14: Performance hardening | Optimizations applied |

### Coding Block (5 hours: 10:00-15:00)
| Time | Task | Deliverable |
|------|------|-------------|
| 10:00-12:00 | Phase 15: Cloud deployment | Live on cloud provider |
| 12:00-13:00 | Phase 15: SSL + domain | HTTPS working |
| 13:00-15:00 | Phase 15: Production database | Data migrated |

### Evening Block (3 hours: 15:00-18:00)
| Time | Task | Deliverable |
|------|------|-------------|
| 15:00-16:30 | Phase 12: Final demo data | Demo scenarios complete |
| 16:30-18:00 | Phase 14: Health checks + monitoring | Monitoring active |

### End-of-Day Deliverables:
- [ ] Live at production URL
- [ ] SSL certificate active
- [ ] Demo data fully populated
- [ ] User roles working
- [ ] System stable under load

### Technical Debt Accepted:
- Basic monitoring only
- Manual backup process
- No auto-scaling

---

## Day 6: Demo & Sales Prep (Saturday)
**Theme:** "Prepare to sell"

### Morning Block (4 hours: 6:00-10:00)
| Time | Task | Deliverable |
|------|------|-------------|
| 6:00-8:00 | Phase 16: Demo script writing | 15-min demo script |
| 8:00-10:00 | Phase 16: Demo rehearsal x2 | Smooth demo flow |

### Business Block (5 hours: 10:00-15:00)
| Time | Task | Deliverable |
|------|------|-------------|
| 10:00-12:00 | Phase 17: Pitch deck creation | 10-slide deck |
| 12:00-13:30 | Phase 17: Product brief | 2-page PDF |
| 13:30-15:00 | Phase 17: Capability statement | 1-page document |

### Evening Block (3 hours: 15:00-18:00)
| Time | Task | Deliverable |
|------|------|-------------|
| 15:00-16:30 | Phase 16: FAQ preparation | Q&A document |
| 16:30-18:00 | Phase 16: Video recording | Backup video demo |

### End-of-Day Deliverables:
- [ ] Demo script finalized
- [ ] Pitch deck complete
- [ ] Product brief PDF
- [ ] Capability statement
- [ ] Video demo recorded
- [ ] Demo rehearsed 3x minimum

### Technical Debt Accepted:
- Video may be rough
- Materials may need iteration
- Not all questions anticipated

---

## Day 7: Outreach & Launch (Sunday)
**Theme:** "Start selling"

### Morning Block (4 hours: 6:00-10:00)
| Time | Task | Deliverable |
|------|------|-------------|
| 6:00-8:00 | Phase 18: Partner outreach prep | Proposal templates |
| 8:00-10:00 | Phase 19: Grant materials | Concept note draft |

### Outreach Block (5 hours: 10:00-15:00)
| Time | Task | Deliverable |
|------|------|-------------|
| 10:00-12:00 | Phase 18: Contact research | 15 qualified contacts |
| 12:00-14:00 | Send outreach emails | 10 emails sent |
| 14:00-15:00 | LinkedIn outreach | 10 connection requests |

### Evening Block (3 hours: 15:00-18:00)
| Time | Task | Deliverable |
|------|------|-------------|
| 15:00-16:00 | Phase 20: Final system check | All systems verified |
| 16:00-17:00 | Phase 20: Documentation | Runbook complete |
| 17:00-18:00 | Phase 20: Plan Week 2 | Follow-up scheduled |

### End-of-Day Deliverables:
- [ ] 10 outreach emails sent
- [ ] 10 LinkedIn requests sent
- [ ] Grant concept note ready
- [ ] System fully stable
- [ ] Week 2 plan clear

---

# Part 3: Sell-Ready MVP Definition

## 3.1 Feature Tiers

### Tier 1: Required for Demo (Must Have by Day 6)

| Feature | Purpose | Demo Impact |
|---------|---------|-------------|
| AIIM branding | Professional appearance | First impression |
| Telegram monitoring | Primary differentiator | "We monitor Telegram" is the hook |
| Narrative tracking | Core value proposition | Shows intelligence capability |
| Election dashboard | Visual impact | Makes value obvious instantly |
| Alert system | Early warning demo | Shows proactive monitoring |
| PDF reports | Donor deliverable proof | "You can report to funders with one click" |
| Armenian content | Local relevance | Proves Armenia focus |
| Real data (7 days) | Credibility | Shows working system |

### Tier 2: Required for Pilot (Must Have by Day 14)

| Feature | Purpose | Pilot Impact |
|---------|---------|--------------|
| User roles | Multi-user access | CSO can onboard team |
| Source management | Customization | Partners add own sources |
| Excel export | Data analysis | Researchers need raw data |
| Email alerts | Operational use | Real notification workflow |
| API access | Integration | Power users need data access |
| Stable hosting | Reliability | Can't crash during pilot |

### Tier 3: Required for Grant Proposal (Must Have by Day 21)

| Feature | Purpose | Grant Impact |
|---------|---------|--------------|
| Methodology docs | Transparency | Donors need to understand approach |
| Impact metrics | Measurement | Shows how to measure success |
| Roadmap | Future vision | Shows sustainability |
| Security documentation | Compliance | Due diligence requirement |
| Partner testimonials | Social proof | Validates approach |

## 3.2 What Can Be Mocked (Acceptable for Demo)

| Feature | Real vs. Mock | Notes |
|---------|---------------|-------|
| Geographic heatmap | Mock | Static image with clickable regions |
| Real-time updates | Mock | 30-second polling is fine |
| ML-based detection | Mock | Keyword matching looks same to donor |
| Email notifications | Mock | Show template, don't need working SMTP |
| Multi-language NLP | Mock | Armenian keyword matching sufficient |
| Historical trends | Mock | Seeded data for demo period |
| User analytics | Mock | Hardcoded numbers acceptable |

## 3.3 What Must Be Real (Credibility Requirements)

| Feature | Why Real Matters |
|---------|------------------|
| Telegram data | Core differentiator; easy to verify |
| Armenian news articles | Donors will recognize sources |
| Working search | Basic functionality must work |
| PDF download | Must actually download file |
| Login/auth | Must demonstrate security |
| Live URL | Can't demo localhost |

---

# Part 4: Implementation Playbook

## 4.1 Repository Structure

```
aiim/
├── backend/                     # Spring Boot
│   ├── src/main/java/com/aiim/
│   │   ├── controller/
│   │   │   ├── ArticleController.java
│   │   │   ├── NarrativeController.java
│   │   │   ├── AlertController.java
│   │   │   ├── ReportController.java
│   │   │   └── SourceController.java
│   │   ├── service/
│   │   │   ├── NarrativeService.java
│   │   │   ├── AlertService.java
│   │   │   └── ReportService.java
│   │   ├── model/
│   │   │   ├── Narrative.java
│   │   │   ├── Alert.java
│   │   │   └── ContentItem.java
│   │   └── dto/
│   │       ├── NarrativeDTO.java
│   │       └── AlertDTO.java
│   └── src/main/resources/
│       └── db/migration/
│           ├── V5__narratives.sql
│           ├── V6__alerts.sql
│           └── V7__unified_content.sql
│
├── frontend/                    # React
│   ├── src/
│   │   ├── pages/
│   │   │   ├── ElectionDashboard.tsx    # NEW: Main dashboard
│   │   │   ├── NarrativesPage.tsx       # NEW: Narrative tracking
│   │   │   ├── AlertsPage.tsx           # NEW: Alert management
│   │   │   ├── ReportsPage.tsx          # NEW: Report generation
│   │   │   ├── SourcesPage.tsx          # NEW: Source management
│   │   │   └── NewsPage.tsx             # EXISTING: Updated
│   │   ├── components/
│   │   │   ├── Timeline.tsx             # NEW: Narrative timeline
│   │   │   ├── MetricCard.tsx           # NEW: Dashboard metrics
│   │   │   ├── AlertBanner.tsx          # NEW: Alert display
│   │   │   └── NarrativeCard.tsx        # NEW: Narrative summary
│   │   └── assets/
│   │       ├── aiim-logo.svg
│   │       └── aiim-logo.png
│   └── public/
│       └── favicon.ico
│
├── scraper/                     # Python
│   ├── src/
│   │   ├── sources/
│   │   │   ├── telegram_client.py       # NEW: Telegram scraper
│   │   │   └── newsapi_client.py        # EXISTING
│   │   ├── services/
│   │   │   ├── narrative_detector.py    # NEW: Narrative matching
│   │   │   ├── alert_generator.py       # NEW: Alert detection
│   │   │   └── topic_search.py          # EXISTING
│   │   └── config/
│   │       └── channels.json            # Telegram channel list
│   └── requirements.txt                  # Add telethon
│
├── docs/                        # Documentation
│   ├── demo-script.md
│   ├── methodology.md
│   ├── deployment.md
│   └── api.md
│
├── sales/                       # Sales materials
│   ├── pitch-deck.pdf
│   ├── product-brief.pdf
│   ├── capability-statement.pdf
│   └── one-pager.pdf
│
├── scripts/                     # Automation
│   ├── deploy.sh
│   ├── seed-demo.sh
│   ├── reset-demo.sh
│   └── backup.sh
│
├── docker-compose.yml
├── docker-compose.prod.yml
└── README.md
```

## 4.2 Database Schema Additions

```sql
-- V5__narratives.sql
CREATE TABLE narratives (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    keywords TEXT[] NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    first_seen TIMESTAMPTZ,
    last_seen TIMESTAMPTZ,
    article_count INTEGER DEFAULT 0,
    threat_level VARCHAR(20) DEFAULT 'LOW',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE article_narratives (
    article_id BIGINT REFERENCES articles(id),
    narrative_id BIGINT REFERENCES narratives(id),
    confidence DECIMAL(3,2),
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (article_id, narrative_id)
);

CREATE INDEX idx_narratives_status ON narratives(status);
CREATE INDEX idx_article_narratives_narrative ON article_narratives(narrative_id);

-- V6__alerts.sql
CREATE TABLE alerts (
    id BIGSERIAL PRIMARY KEY,
    narrative_id BIGINT REFERENCES narratives(id),
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by BIGINT REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'ACTIVE',
    metadata JSONB
);

CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_triggered ON alerts(triggered_at DESC);

-- V7__unified_content.sql
ALTER TABLE articles ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) DEFAULT 'NEWS';
ALTER TABLE articles ADD COLUMN IF NOT EXISTS platform VARCHAR(50);
ALTER TABLE articles ADD COLUMN IF NOT EXISTS engagement_count INTEGER DEFAULT 0;

CREATE INDEX idx_articles_source_type ON articles(source_type);
CREATE INDEX idx_articles_platform ON articles(platform);
```

## 4.3 Deployment Checklist

```markdown
## Pre-Deployment (Day 5 Morning)
- [ ] All environment variables documented
- [ ] Production database created
- [ ] Domain DNS configured
- [ ] SSL certificate ready

## Deployment (Day 5 Afternoon)
- [ ] Backend deployed and healthy
- [ ] Frontend deployed and loading
- [ ] Database migrations run
- [ ] Scraper deployed and running
- [ ] Health checks passing

## Post-Deployment (Day 5 Evening)
- [ ] Demo data seeded
- [ ] All pages loading
- [ ] Login working
- [ ] PDF export working
- [ ] Telegram data flowing

## Demo Readiness (Day 6)
- [ ] Demo accounts created
- [ ] Demo scenarios staged
- [ ] Reset script tested
- [ ] Full demo rehearsed
```

## 4.4 Demo Dataset Specification

```yaml
demo_period:
  start: "2025-02-09"  # 7 days before demo
  end: "2025-02-16"    # Demo day

content_volume:
  news_articles: 500
  telegram_messages: 2000
  sources:
    news: 25
    telegram_channels: 30

narratives:
  - name: "Election Fraud Claims"
    keywords: ["fraud", "rigged", "stolen", "delays", "falsification"]
    article_count: 45
    threat_level: HIGH
    trend: RISING

  - name: "Foreign Interference"
    keywords: ["Russia", "West", "interference", "manipulation"]
    article_count: 32
    threat_level: MEDIUM
    trend: STABLE

  - name: "Candidate Disinformation"
    keywords: ["[candidate names]", "scandal", "corruption"]
    article_count: 28
    threat_level: MEDIUM
    trend: RISING

  - name: "Voter Suppression Narratives"
    keywords: ["don't vote", "boycott", "pointless"]
    article_count: 15
    threat_level: LOW
    trend: EMERGING

alerts:
  - type: VOLUME_SPIKE
    narrative: "Election Fraud Claims"
    severity: HIGH
    triggered: "2025-02-14 14:30"
    description: "3x normal volume detected in 2 hours"

  - type: NEW_NARRATIVE
    narrative: "Voter Suppression"
    severity: MEDIUM
    triggered: "2025-02-13 09:15"
    description: "New coordinated narrative detected"

  - type: CROSS_PLATFORM
    narrative: "Foreign Interference"
    severity: HIGH
    triggered: "2025-02-15 11:00"
    description: "Narrative spreading from Telegram to news"

timeline_events:
  - date: "2025-02-10"
    event: "Candidate registration deadline"
    narratives_active: 2

  - date: "2025-02-12"
    event: "TV debate"
    narratives_active: 3
    spike: true

  - date: "2025-02-15"
    event: "Early voting begins"
    narratives_active: 4
    spike: true
```

---

# Part 5: Demo & Sales Package

## 5.1 Demo Script (15 Minutes)

### Opening (2 minutes)
```
"Thank you for your time. I'm [Name], founder of AIIM - the Armenia
Information Integrity Monitor.

With Armenia's 2026 elections approaching, civil society needs tools
to detect and respond to information threats before they undermine
democratic processes.

Let me show you how AIIM makes this possible."
```

### Dashboard Overview (3 minutes)
```
[Show Election Dashboard]

"This is our election monitoring dashboard. Right now, you're seeing
real data from the past 7 days.

[Point to metrics]
- We're monitoring 55 sources across news and Telegram
- We've tracked 2,500 pieces of content
- We've identified 4 active disinformation narratives
- Our system has generated 3 high-priority alerts

[Point to timeline]
This timeline shows how narratives have evolved. Notice the spike
on February 12th - that coincided with the TV debate. Our system
detected a coordinated campaign within 2 hours."
```

### Narrative Tracking (3 minutes)
```
[Click into "Election Fraud Claims" narrative]

"Let me show you how we track specific narratives. This is 'Election
Fraud Claims' - currently our highest-threat narrative.

[Show content list]
Here's every piece of content spreading this narrative - from news
sites, Telegram channels, even cross-posted content.

[Show source breakdown]
We can see this started on Telegram and spread to news. This
cross-platform pattern often indicates coordination.

[Show trend]
The trend is rising, which is why our system flagged this as HIGH
threat."
```

### Telegram Integration (2 minutes)
```
[Show Telegram content]

"A key differentiator: we monitor Telegram, which is the primary
channel for disinformation in Armenia.

[Show channel list]
We're currently monitoring 30 channels, from news aggregators to
political commentary. We capture messages within 30 minutes of
posting.

[Show specific example]
This message, posted yesterday, was flagged as part of the 'Foreign
Interference' narrative. Within 4 hours, similar messaging appeared
on 3 news sites."
```

### Alert System (2 minutes)
```
[Show Alerts page]

"Our early warning system alerts you to threats before they go viral.

[Show recent alert]
This alert triggered 2 days ago when we detected a 3x spike in
'Election Fraud' content. This gave our pilot partners a 6-hour
head start to prepare fact-checks.

[Show alert details]
Each alert includes the narrative, affected sources, sample content,
and suggested response actions."
```

### Reporting (2 minutes)
```
[Show Reports page]

"For donors and stakeholders, we provide one-click reporting.

[Generate PDF]
I'll generate a weekly summary right now...

[Show PDF]
This includes all the metrics your funders need: narratives tracked,
alerts generated, coverage statistics. It's formatted for EU
reporting requirements.

You can also export to Excel for your own analysis."
```

### Closing (1 minute)
```
"AIIM gives civil society the infrastructure to protect Armenia's
information space during the critical 2026 election period.

We're currently seeking pilot partners to help us refine the
platform before broader deployment.

As a pilot partner, you'd get:
- Free access during the pilot period
- Direct input on feature development
- Priority support
- Co-branding on publications

What questions do you have?"
```

## 5.2 Likely Questions & Answers

| Question | Answer |
|----------|--------|
| "How do you detect disinformation?" | "We use a combination of keyword matching, volume spike detection, and cross-platform correlation. We flag content for human review - we never auto-label anything as disinformation. Fact-checkers make final determinations." |
| "Is this legal?" | "Yes. We only monitor public content - public news sites and public Telegram channels. We don't access private messages or require any hacking. Our methodology is transparent and documented." |
| "What about false positives?" | "Everything is flagged for review, never auto-labeled. Our system optimizes for recall - we'd rather flag 10 things and have 8 be relevant than miss the 2 important ones." |
| "Who else is using this?" | "We're in pilot discussions with [InFact/MIC/other - whoever you've contacted]. We're specifically seeking civil society partners before the election cycle." |
| "How much does it cost?" | "For pilot partners, access is free. Post-pilot, we offer tiered pricing based on organization size, typically €X-Y/year for CSOs. We also support grant-funded deployments." |
| "Can we add our own sources?" | "Yes. You can add any news site URL or Telegram channel. We handle the technical ingestion." |
| "What about Armenian language?" | "Our system fully supports Armenian text. We display, search, and analyze Armenian content natively." |
| "How is this different from [X]?" | "Unlike generic social listening tools, AIIM is built specifically for election integrity in Armenia. We focus on narratives, not just keywords. We monitor Telegram, which most tools don't. And we're locally owned and operated." |

## 5.3 Pitch Deck Outline (10 Slides)

```
Slide 1: Title
- AIIM: Armenia Information Integrity Monitor
- "Protecting Armenia's Information Space"
- Subtitle: Election Integrity Infrastructure for 2026

Slide 2: The Problem
- Armenia faces coordinated disinformation campaigns
- 2026 elections are high-stakes
- Civil society lacks monitoring tools
- Telegram is unmonitored
- Detection currently takes days, not hours

Slide 3: The Solution
- Real-time monitoring across platforms
- Narrative tracking (not just keywords)
- Early warning alerts
- One-click donor reporting
- Built for Armenian context

Slide 4: How It Works
- [Architecture diagram]
- Sources → Ingestion → Analysis → Alerts → Reports

Slide 5: Key Features
- 55+ sources monitored
- Telegram + news coverage
- Narrative clustering
- Volume spike detection
- PDF/Excel reporting
- Multi-user access

Slide 6: Demo Screenshot
- [Election Dashboard screenshot]
- Key metrics highlighted

Slide 7: Target Users
- Election observers (OSCE, ENEMO)
- Fact-checkers (InFact network)
- CSOs (MIC, FOICA, TI Armenia)
- Independent media (Hetq, CivilNet)
- International programs (Internews, NDI)

Slide 8: Pilot Program
- Free access during pilot (3 months)
- Direct feature input
- Priority support
- Co-branding opportunities
- Seeking 5 pilot partners

Slide 9: Roadmap
- Q1 2025: Pilot launch
- Q2 2025: Full platform
- Q3 2025: Election deployment
- 2026: Election coverage

Slide 10: Next Steps
- Schedule pilot onboarding
- Contact: [email]
- Website: [URL]
```

## 5.4 Product Brief (2-Page Structure)

**Page 1:**
```
AIIM: ARMENIA INFORMATION INTEGRITY MONITOR
Protecting Armenia's Information Space

THE CHALLENGE
[2 paragraphs on disinformation threat, election stakes, capability gap]

THE SOLUTION
[2 paragraphs on what AIIM does, key differentiators]

KEY CAPABILITIES
• Real-time monitoring (55+ sources)
• Telegram integration (30+ channels)
• Narrative tracking & clustering
• Early warning alerts
• One-click donor reporting
```

**Page 2:**
```
FOR ELECTION OBSERVERS
[How AIIM helps OSCE/ODIHR, domestic observers]

FOR FACT-CHECKERS
[How AIIM helps InFact, verification workflows]

FOR CIVIL SOCIETY
[How AIIM helps CSOs monitor, report, respond]

PILOT PROGRAM
[What partners get, commitment required]

CONTACT
[Email, website, meeting request link]
```

---

# Part 6: Risk & Fallback Plan

## 6.1 Critical Risks by Day

| Day | Risk | Impact | Fallback |
|-----|------|--------|----------|
| 1 | Telegram API blocked | No Telegram data | Use telegram-web scraping instead; Present as "coming soon" in demo |
| 2 | Narrative detection too slow | Can't process real-time | Pre-compute overnight; Show historical view only |
| 3 | Dashboard complexity | Can't finish in time | Simplify to 3 key metrics + timeline only |
| 4 | PDF generation fails | No report export | Use browser print-to-PDF; Fix post-demo |
| 5 | Deployment issues | No live demo | Demo from localhost via screen share |
| 6 | Demo environment crashes | Demo fails | Use recorded video backup |
| 7 | No responses to outreach | No pipeline | Follow up Week 2; Use warm intros |

## 6.2 Technical Fallbacks

**If Telegram scraping doesn't work:**
```
Option A: Use telegram-web-scraper library
Option B: Manual data collection for demo (50 messages)
Option C: Mock Telegram data, label as "Integration in progress"
```

**If narrative detection is too complex:**
```
Option A: Pure keyword matching (simple but effective)
Option B: Pre-label demo data manually
Option C: Present as "analyst-assisted detection"
```

**If PDF generation fails:**
```
Option A: Server-side generation with Puppeteer
Option B: Client-side with jsPDF
Option C: Browser print dialog (always works)
```

**If deployment fails:**
```
Option A: Railway (primary)
Option B: Render (backup)
Option C: DigitalOcean droplet (manual)
Option D: Localhost demo via Zoom screen share
```

## 6.3 Time Recovery Strategies

**If 4+ hours behind by Day 3:**
- Cut geographic heatmap entirely
- Reduce dashboard to metrics + timeline only
- Use static demo data instead of real-time

**If 8+ hours behind by Day 5:**
- Deploy minimal version
- Focus on 3 core features: Telegram, Narratives, Dashboard
- Cut reporting to Excel-only (no PDF)
- Do demo from localhost

**If demo environment unstable:**
- Record 10-minute video on Day 6
- Use video as primary, live demo as "if time permits"

## 6.4 Acceptable Technical Debt Summary

| Category | Acceptable Debt | Must Fix By |
|----------|-----------------|-------------|
| **Security** | Basic auth only, no MFA | Pilot launch |
| **Performance** | Slow on large queries | Pilot launch |
| **Testing** | Zero automated tests | Month 2 |
| **Documentation** | Minimal inline docs | Month 2 |
| **Error Handling** | Basic try/catch | Pilot launch |
| **Monitoring** | Health check only | Pilot launch |
| **Logging** | Console only | Week 3 |
| **Mobile** | Not responsive | Month 2 |
| **Accessibility** | Not compliant | Month 3 |

## 6.5 Non-Negotiables (Must Complete)

| Item | Reason | Day Due |
|------|--------|---------|
| AIIM branding | First impression | Day 1 |
| Telegram data (real or mocked) | Core differentiator | Day 2 |
| Narrative tracking UI | Value proposition | Day 3 |
| Election dashboard | Visual impact | Day 3 |
| PDF export (any method) | Donor requirement | Day 4 |
| Live URL with SSL | Demo credibility | Day 5 |
| 15-min smooth demo | Sales capability | Day 6 |
| 10 outreach emails sent | Pipeline start | Day 7 |

---

# Execution Commitment

Print this and check off each day:

```
□ Day 1: Telegram pipeline working, AIIM branding live
□ Day 2: Narratives tracking, alerts generating
□ Day 3: Election dashboard functional, demo data ready
□ Day 4: Reporting working, exports functional
□ Day 5: Live deployment, system stable
□ Day 6: Demo rehearsed 3x, materials complete
□ Day 7: 10 emails sent, Week 2 planned
```

**You have 168 hours. Use them.**
