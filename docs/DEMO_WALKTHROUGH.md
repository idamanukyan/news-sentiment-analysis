# AIIM Demo Walkthrough Script

**Duration:** 15-20 minutes
**Audience:** Donors, stakeholders, election observers

---

## Pre-Demo Checklist

- [ ] All services running: `docker-compose ps`
- [ ] Frontend accessible: http://localhost:5173
- [ ] Demo account ready: `demo@aiim.am` / `AiimDemo2026`
- [ ] Browser in incognito mode (clean state)

---

## Demo Flow

### 1. Introduction (2 min)

**Open login page**

> "Welcome to AIIM - the AI Information Integrity Monitor. This platform was built to help election observers, journalists, and civil society track disinformation narratives in real-time across Armenian media."

**Key talking points:**
- Monitors 74+ sources across Armenian, Russian, and English media
- Non-partisan: tracks government, opposition, and independent sources equally
- Real-time alerts for emerging threats

### 2. Login & Dashboard Overview (3 min)

**Login with demo@aiim.am**

> "Let me show you the main dashboard..."

**Highlight on dashboard:**

1. **Election Countdown** (top)
   > "The countdown shows days until the June 2026 elections - our monitoring intensifies as we approach election day."

2. **Key Metrics** (stat cards)
   > "Currently tracking over 4,400 articles from 74 sources, with 550+ active narratives and 750+ automated alerts."

3. **Threat Gauge**
   > "The overall threat level is MEDIUM - this is calculated automatically based on narrative activity and alert severity."

4. **Live Indicator**
   > "Notice the green pulse - the system updates every 30 seconds with new content."

### 3. Narratives Deep Dive (4 min)

**Navigate to Narratives page**

> "Narratives are the core of our analysis. These are themes or storylines that appear across multiple sources."

**Show narrative list:**
- Point out threat level colors (red = high, amber = medium)
- Show article counts
- Demonstrate filtering by threat level

**Click on a specific narrative:**
> "Each narrative shows related articles, source distribution, and timeline of activity. This helps analysts understand how a story spreads."

**Key points:**
- Auto-detection via NLP clustering
- Manual narrative creation for known campaigns
- Keywords and article matching

### 4. Alert System (3 min)

**Navigate to Alerts page**

> "The alert system automatically detects anomalies..."

**Types of alerts:**
1. **Volume Spikes** - Sudden increase in coverage of a topic
2. **Cross-Platform** - Same narrative appearing on multiple sources simultaneously
3. **Coordinated** - Patterns suggesting organized campaigns

**Demonstrate:**
- Click on a HIGH severity alert
- Show the "Acknowledge" and "Resolve" workflow
- Explain how analysts triage alerts

### 5. Source Management (2 min)

**Navigate to Sources page**

> "We maintain a balanced monitoring across the political spectrum..."

**Show non-partisan banner:**
- Government-aligned: X sources
- Opposition-aligned: Y sources
- Independent: Z sources

> "This ensures we're not biased toward any political faction."

**Show source types:**
- RSS feeds (real-time)
- Telegram channels (social monitoring)
- Web scraping (for sources without feeds)

### 6. Reporting (3 min)

**Navigate to Reports page**

> "For donor reporting and stakeholder briefings, we can generate professional reports..."

**Show report types:**
1. **Weekly Briefing** - Comprehensive weekly summary
2. **Daily Summary** - 24-hour snapshot
3. **Incident Report** - Deep dive on specific narrative
4. **EU DSA Compliance** - Format for regulatory requirements

**Generate a Weekly Report preview:**
- Show executive summary
- Highlight key metrics
- Demonstrate CSV/Markdown export

> "Reports can be exported in multiple formats for different stakeholders."

### 7. Q&A Points

**Common questions to address:**

**Q: How do you determine threat levels?**
> "Threat levels are based on: article volume, source diversity, sentiment, and rate of spread. High-threat narratives show coordinated patterns across multiple sources."

**Q: How accurate is the sentiment analysis?**
> "We use Claude AI for sentiment analysis with ~85% accuracy. Results are aggregated across articles, so individual errors average out."

**Q: Can this scale for national elections?**
> "Yes - the architecture handles thousands of articles daily. For peak election periods, we can add more monitoring resources."

**Q: What's the human element?**
> "AIIM augments human analysts, not replaces them. The system surfaces potential issues; trained analysts make final determinations."

---

## Demo Environment Stats

| Metric | Current Value |
|--------|---------------|
| Total Articles | 4,400+ |
| Active Sources | 41 |
| Active Narratives | 550+ |
| Active Alerts | 750+ |
| Languages | Armenian, Russian, English |
| Update Frequency | Every 30 seconds |

---

## Troubleshooting

**If login fails:**
```bash
# Check backend is running
curl http://localhost:8080/api/v1/system/health
```

**If data looks stale:**
```bash
# Restart scraper
docker-compose restart scraper
```

**If charts don't load:**
- Clear browser cache
- Check browser console for errors

---

## Post-Demo Follow-up

1. Share access credentials for evaluation period
2. Provide technical documentation (README.md)
3. Schedule follow-up call for questions
4. Discuss customization requirements
