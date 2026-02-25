# AIIM End-to-End Testing Guide

**Purpose:** Comprehensive workflow testing for client demonstrations
**Last Updated:** 2026-02-18

---

## Test Credentials

| Role | Email | Password | Permissions |
|------|-------|----------|-------------|
| **Admin** | `demo@aiim.am` | `AiimDemo2026` | Full access - create, edit, delete everything |
| **Analyst** | `analyst@aiim.am` | `testpass123` | Create/edit narratives & alerts, cannot delete |
| **Viewer** | `viewer@aiim.am` | `testpass123` | Read-only access to all data |

**Use Admin account for full testing:** `demo@aiim.am` / `AiimDemo2026`

---

## Test Flow

### 1. Login Flow

**URL:** http://localhost:5173

**Steps:**
1. Open browser to http://localhost:5173
2. You should see the login page with AIIM branding
3. Enter credentials:
   - Email: `demo@aiim.am`
   - Password: `AiimDemo2026`
4. Click "Sign In"

**Expected:**
- Redirected to Election Dashboard
- See election countdown timer
- See stats cards (Articles, Sources, Narratives, Alerts)
- See threat level gauge
- Green "LIVE" indicator pulsing

---

### 2. Dashboard Exploration

**Steps:**
1. Review the Election Countdown (top section)
2. Check the 4 stat cards showing:
   - Total Articles (~4,600+)
   - Active Sources (74)
   - Active Narratives (800+)
   - Active Alerts (750+)
3. View the Threat Level gauge (should show MEDIUM)
4. Check "Recent Activity" section
5. Look at "Top Narratives by Threat" list

**Expected:**
- All numbers load (no spinners stuck)
- Charts render properly
- Clicking a narrative navigates to detail

---

### 3. Narratives Page

**Navigate:** Click "Narratives" in sidebar

**Steps:**
1. View the summary cards at top:
   - Total Narratives
   - Active count
   - High Threat count
   - Total Articles
2. Test filter buttons:
   - Click "All" - shows all narratives
   - Click "Active" - filters to active only
   - Click "High Threat" - shows HIGH/CRITICAL only
3. Click on any narrative card to open detail panel

**Expected:**
- Grid of narrative cards loads
- Filters update the count
- Cards show keywords, threat level badges, article counts

---

### 4. Create a New Narrative

**Steps:**
1. Click "+ Add Narrative" button (top right)
2. Fill in the form:

**Test Data:**
```
Name: Test Election Fraud Claims
Description: Monitoring claims of election irregularities and fraud allegations
Keywords: election fraud, vote rigging, ballot stuffing, stolen election
Threat Level: HIGH
```

3. Click "Create Narrative"

**Expected:**
- Modal closes
- New narrative appears in the grid
- Toast notification "Narrative created"
- Card shows HIGH threat badge (red)

---

### 5. View Narrative Details

**Steps:**
1. Click on the narrative you just created
2. In the slide-out panel, review:
   - Header with threat level and status badges
   - Metadata row (First Detected, Last Activity, etc.)
   - Keywords section
   - Sentiment Distribution bar
3. Click "Timeline" tab - shows articles matching keywords
4. Click "Sources" tab - shows which sources reported

**Expected:**
- Panel slides in from right
- Initially may show 0 articles (new narrative)
- Tabs switch content correctly

---

### 6. Alerts Page

**Navigate:** Click "Alerts" in sidebar

**Steps:**
1. If active alerts exist, see the red banner at top
2. Review stat cards:
   - Active (red)
   - Acknowledged (amber)
   - Resolved (green)
   - High/Critical count
3. Test filters:
   - "All Alerts"
   - "Requires Action"
   - "Resolved"
4. Click on any alert to view details

**Expected:**
- Alert cards show severity badges
- Icons indicate alert type (volume spike, coordinated, etc.)
- Action buttons visible on active alerts

---

### 7. Alert Workflow (Acknowledge -> Resolve)

**Steps:**
1. Find an ACTIVE alert (red status badge)
2. Click the eye icon to "Acknowledge"
3. Alert status changes to ACKNOWLEDGED (amber)
4. Click the checkmark to "Resolve"
5. Alert status changes to RESOLVED (green)

**Alternative:**
1. Click on an alert to open detail modal
2. Click "Acknowledge" button
3. Click "Resolve" button

**Expected:**
- Status badges update immediately
- Counts in stat cards update
- Toast notifications appear

---

### 8. Sources Page

**Navigate:** Click "Sources" in sidebar

**Steps:**
1. View the "Non-Partisan Coverage" banner showing:
   - Government-aligned count
   - Opposition-aligned count
   - Independent count
2. Review stat cards (Total, RSS, Telegram, Web, Active)
3. Test filters:
   - "All Sources"
   - "RSS"
   - "Telegram"
   - "Web"
4. View the sources table with columns:
   - Source name & URL
   - Type badge
   - Political leaning
   - Language flag
   - Status indicator
   - Last fetched time
   - Article count

**Expected:**
- Table loads with 74 sources
- Filters work correctly
- Status shows green "Active" for most sources

---

### 9. Add a New Source (Admin Only)

**Steps:**
1. Click "+ Add Source" button
2. Fill in the form:

**Test Data for RSS:**
```
Source Type: RSS Feed
Name: Test News Source
URL: https://example.com/rss
Language: English
Political Leaning: Independent
Active: checked
```

3. Click "Add Source"

**Expected:**
- Modal closes
- New source appears in table
- Toast notification "Source created"

---

### 10. Edit/Toggle Source

**Steps:**
1. Find the source you created
2. Click the pencil icon to edit
3. Change the name to "Test News Source (Updated)"
4. Click "Update"
5. Click the power icon to disable the source
6. Status changes to "Inactive"

**Expected:**
- Edit modal pre-fills with existing data
- Updates save correctly
- Toggle changes status immediately

---

### 11. News/Articles Page

**Navigate:** Click "News" in sidebar

**Steps:**
1. View the article list
2. Test search:
   - Type "election" in search box
   - Results filter to matching articles
3. Test filters:
   - Sentiment: Positive/Negative/Neutral
   - Source type: RSS/Telegram/Web
   - Date range picker
4. Click on an article to expand/view details
5. Click external link icon to open original article

**Expected:**
- Articles load with pagination
- Filters narrow results
- Sentiment badges show colors (green/red/gray)
- External links open in new tab

---

### 12. Reports Page

**Navigate:** Click "Reports" in sidebar

**Steps:**
1. View the 4 report templates:
   - Weekly Briefing
   - Daily Summary
   - Incident Report
   - EU DSA Compliance
2. Click on "Weekly Briefing"
3. Click "Preview Report"
4. Review the generated preview:
   - Summary stats
   - Narratives table
   - Alerts table
5. Click "Export CSV" - file downloads
6. Click "Export Markdown" - file downloads

**Expected:**
- Report types display with icons
- Preview generates and shows data
- CSV opens in Excel/Sheets
- Markdown is properly formatted

---

### 13. Incident Report (Specific Narrative)

**Steps:**
1. Click on "Incident Report" template
2. Select a narrative from the dropdown
3. Click "Preview Report"
4. Review the narrative-specific report
5. Export as needed

**Expected:**
- Dropdown shows all narratives
- Report focuses on selected narrative
- Shows related articles and alerts

---

### 14. Role-Based Access Testing

**Test Viewer Role:**
1. Logout (click user menu -> Logout)
2. Login as: `viewer@aiim.am` / `testpass123`
3. Navigate to Narratives page
4. Verify: NO "+ Add Narrative" button visible
5. Navigate to Sources page
6. Verify: NO "+ Add Source" button, NO edit/delete icons
7. Navigate to Alerts page
8. Verify: NO Acknowledge/Resolve buttons

**Test Analyst Role:**
1. Logout and login as: `analyst@aiim.am` / `testpass123`
2. Navigate to Narratives
3. Verify: CAN create/edit narratives
4. Navigate to Sources
5. Verify: CANNOT add/edit sources (Admin only)
6. Navigate to Alerts
7. Verify: CAN acknowledge/resolve alerts

---

### 15. Session & Auth Testing

**Steps:**
1. Login as admin
2. Copy the current URL
3. Open a new incognito window
4. Paste the URL
5. Should redirect to login page

**Token Expiry Test:**
1. Login normally
2. Open browser dev tools -> Application -> Local Storage
3. Find `auth-storage` key
4. Manually delete it
5. Refresh page
6. Should redirect to login

---

### 16. Error Handling

**Test Invalid Login:**
1. On login page, enter:
   - Email: `wrong@email.com`
   - Password: `wrongpassword`
2. Click Sign In
3. Should see error message

**Test 404:**
1. Navigate to http://localhost:5173/nonexistent
2. Should see 404 page or redirect to dashboard

---

## Quick Checklist

```
[ ] Login works with all 3 accounts
[ ] Dashboard loads all stats
[ ] Election countdown displays correctly
[ ] Narratives list and filter
[ ] Create new narrative
[ ] View narrative details
[ ] Alerts list and filter
[ ] Acknowledge alert
[ ] Resolve alert
[ ] Sources list and filter
[ ] Add new source (admin)
[ ] Edit source (admin)
[ ] Toggle source active/inactive
[ ] News/Articles search works
[ ] Article filters work
[ ] Report preview generates
[ ] CSV export downloads
[ ] Markdown export downloads
[ ] Viewer role has read-only access
[ ] Analyst role can edit narratives/alerts
[ ] Logout works
[ ] Session persists on refresh
[ ] Invalid login shows error
```

---

## Test Data Reference

### Narrative Test Data

**Narrative 1:**
```
Name: Anti-EU Disinformation Campaign
Description: Coordinated messaging against European Union integration
Keywords: EU enemy, Brussels control, sovereignty, foreign agents
Threat Level: CRITICAL
```

**Narrative 2:**
```
Name: Election Integrity Doubts
Description: Narratives undermining trust in electoral process
Keywords: rigged, fraud, stolen, irregularities, observers
Threat Level: HIGH
```

**Narrative 3:**
```
Name: Economic Collapse Predictions
Description: Exaggerated claims about economic instability
Keywords: hyperinflation, currency crash, poverty, collapse
Threat Level: MEDIUM
```

### Source Test Data

**Source 1 (RSS):**
```
Name: Armenia Today
URL: https://armeniatoday.example.com/feed
Type: RSS
Language: Armenian
Leaning: Independent
```

**Source 2 (Telegram):**
```
Name: Yerevan Monitor
URL: https://t.me/yerevanmonitor
Type: Telegram
Language: Armenian
Leaning: Opposition
```

**Source 3 (Web Scrape):**
```
Name: Regional News Portal
URL: https://regionalnews.example.com
Type: Web Scrape
Language: Russian
Leaning: Government
```

---

## API Testing (Optional)

For developers who want to test API directly:

### Get Auth Token
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@aiim.am","password":"AiimDemo2026"}'
```

### Test Authenticated Endpoint
```bash
TOKEN="<paste-token-here>"
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/dashboard/stats
```

### Create Narrative via API
```bash
curl -X POST http://localhost:8080/api/v1/narratives \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "API Test Narrative",
    "description": "Created via API",
    "keywords": ["test", "api"],
    "threatLevel": "LOW"
  }'
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Login fails | Check backend is running: `docker-compose ps` |
| Dashboard empty | Check API: `curl http://localhost:8080/api/v1/system/health` |
| Can't create narrative | Verify logged in as Admin or Analyst role |
| Export not downloading | Check browser popup blocker |
| Slow loading | Check Redis: `docker exec newssentiment-redis redis-cli ping` |
