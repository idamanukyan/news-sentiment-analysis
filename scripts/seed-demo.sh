#!/bin/bash
# AIIM Demo Data Seeding Script
# Seeds the database with realistic demo data for presentations

set -e

cd "$(dirname "$0")/.."

echo "=========================================="
echo "AIIM Demo Data Seeding"
echo "=========================================="

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

# Wait for database
wait_for_db() {
    log_info "Waiting for database..."
    until docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; do
        sleep 1
    done
    log_info "Database is ready"
}

# Seed narratives
seed_narratives() {
    log_info "Seeding narratives..."

    docker-compose exec -T postgres psql -U postgres -d newssentiment << 'EOF'
-- Clear existing narratives
TRUNCATE narratives CASCADE;

-- Insert demo narratives
INSERT INTO narratives (name, description, keywords, status, threat_level, first_seen, article_count, created_at) VALUES
('Election Fraud Claims',
 'Narratives questioning election integrity, claiming fraud or rigging',
 ARRAY['fraud', 'rigged', 'stolen', 'falsification', 'manipulation', 'կdelays', ' delays'],
 'ACTIVE', 'HIGH', NOW() - INTERVAL '5 days', 0, NOW()),

('Foreign Interference',
 'Claims of external actors manipulating Armenian politics',
 ARRAY['Russia', 'West', 'interference', 'manipulation', 'foreign', 'external'],
 'ACTIVE', 'MEDIUM', NOW() - INTERVAL '7 days', 0, NOW()),

('Candidate Attacks',
 'Personal attacks and disinformation about political candidates',
 ARRAY['scandal', 'corruption', 'criminal', 'traitor', 'oligarch'],
 'ACTIVE', 'MEDIUM', NOW() - INTERVAL '3 days', 0, NOW()),

('Voter Suppression',
 'Narratives discouraging voter participation',
 ARRAY['boycott', 'pointless', 'rigged', 'dont vote', 'waste'],
 'ACTIVE', 'LOW', NOW() - INTERVAL '2 days', 0, NOW()),

('Economic Fear',
 'Economic collapse and instability narratives',
 ARRAY['collapse', 'crisis', 'poverty', 'unemployment', 'inflation'],
 'MONITORING', 'LOW', NOW() - INTERVAL '10 days', 0, NOW());

SELECT 'Narratives seeded: ' || COUNT(*) FROM narratives;
EOF
}

# Seed alerts
seed_alerts() {
    log_info "Seeding threat alerts..."

    docker-compose exec -T postgres psql -U postgres -d newssentiment << 'EOF'
-- Clear existing threat alerts
TRUNCATE threat_alerts CASCADE;

-- Insert demo alerts
INSERT INTO threat_alerts (narrative_id, alert_type, severity, title, description, triggered_at, status, metadata) VALUES
((SELECT id FROM narratives WHERE name = 'Election Fraud Claims'),
 'VOLUME_SPIKE', 'HIGH',
 'Surge in Election Fraud Claims',
 '3x increase in election fraud narrative detected across Telegram channels in the past 2 hours. Primary sources: @armtimes, @news24am.',
 NOW() - INTERVAL '6 hours', 'ACTIVE',
 '{"spike_factor": 3.2, "sources": ["telegram", "news"], "articles_count": 45}'),

((SELECT id FROM narratives WHERE name = 'Foreign Interference'),
 'CROSS_PLATFORM', 'HIGH',
 'Foreign Interference Narrative Spreading',
 'Narrative originated on Telegram now appearing on 3 news sites. Coordinated spread pattern detected.',
 NOW() - INTERVAL '1 day', 'ACKNOWLEDGED',
 '{"platforms": ["telegram", "news"], "spread_time_hours": 4}'),

((SELECT id FROM narratives WHERE name = 'Voter Suppression'),
 'NEW_NARRATIVE', 'MEDIUM',
 'New Voter Suppression Campaign Detected',
 'Emerging narrative encouraging election boycott. First detected on political Telegram channels.',
 NOW() - INTERVAL '2 days', 'RESOLVED',
 '{"first_source": "telegram", "initial_reach": 5000}');

SELECT 'Alerts seeded: ' || COUNT(*) FROM threat_alerts;
EOF
}

# Update article counts
update_counts() {
    log_info "Updating narrative article counts..."

    docker-compose exec -T postgres psql -U postgres -d newssentiment << 'EOF'
-- Update narrative article counts based on keyword matches
UPDATE narratives n SET
    article_count = (
        SELECT COUNT(*) FROM articles a
        WHERE a.title ILIKE ANY(
            SELECT '%' || unnest(n.keywords) || '%'
        )
        OR a.content ILIKE ANY(
            SELECT '%' || unnest(n.keywords) || '%'
        )
    ),
    last_seen = NOW();

SELECT name, article_count, threat_level FROM narratives ORDER BY article_count DESC;
EOF
}

# Trigger topic search for fresh data
fetch_fresh_data() {
    log_info "Fetching fresh news data..."
    docker-compose exec -T scraper python -c "from src.services.topic_search import fetch_all_topics; print(f'Fetched {fetch_all_topics()} articles')" 2>/dev/null || log_warn "Scraper fetch skipped"
}

# Main
wait_for_db
seed_narratives
seed_alerts
fetch_fresh_data
update_counts

echo ""
echo "=========================================="
echo "Demo data seeding complete!"
echo "=========================================="
echo ""
echo "Seeded:"
echo "  - 5 narratives (election-focused)"
echo "  - 3 demo alerts"
echo "  - Updated article-narrative mappings"
echo ""
