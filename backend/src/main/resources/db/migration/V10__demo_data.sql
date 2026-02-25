-- AIIM Demo Data Seed
-- Realistic data for Armenia 2026 election monitoring demo

-- ============================================
-- ADD MISSING COLUMNS AND CONSTRAINTS
-- ============================================
ALTER TABLE narratives ADD COLUMN IF NOT EXISTS alert_count INTEGER DEFAULT 0;

-- Add unique constraint on sources.url for ON CONFLICT
CREATE UNIQUE INDEX IF NOT EXISTS idx_sources_url_unique ON sources(url);

-- ============================================
-- SOURCES: Armenian News & Telegram Channels
-- ============================================

-- Armenian News Sources (RSS/Web)
INSERT INTO sources (name, url, type, language, active, config) VALUES
('Armenpress', 'https://armenpress.am/eng/rss/', 'RSS', 'ARMENIAN', true, '{"category": "state_media"}'),
('News.am', 'https://news.am/eng/rss/', 'RSS', 'ARMENIAN', true, '{"category": "news_aggregator"}'),
('Hetq', 'https://hetq.am/en/rss', 'RSS', 'ARMENIAN', true, '{"category": "investigative"}'),
('CivilNet', 'https://www.civilnet.am/en/rss', 'RSS', 'ARMENIAN', true, '{"category": "independent"}'),
('EVN Report', 'https://evnreport.com/feed/', 'RSS', 'ENGLISH', true, '{"category": "analysis"}'),
('Azatutyun (RFE/RL)', 'https://www.azatutyun.am/api/feed', 'RSS', 'ARMENIAN', true, '{"category": "international"}'),
('Factor.am', 'https://factor.am/rss', 'RSS', 'ARMENIAN', true, '{"category": "news"}'),
('Mediamax', 'https://mediamax.am/en/rss/', 'RSS', 'ARMENIAN', true, '{"category": "business"}'),
('168.am', 'https://168.am/rss', 'RSS', 'ARMENIAN', true, '{"category": "opposition"}'),
('Hraparak', 'https://hraparak.am/rss', 'RSS', 'ARMENIAN', true, '{"category": "tabloid"}'),
('Sputnik Armenia', 'https://sputnikarm.am/export/rss', 'RSS', 'RUSSIAN', true, '{"category": "russian_media", "bias": "pro_russia"}')
ON CONFLICT (url) DO NOTHING;

-- Telegram Channels
INSERT INTO sources (name, url, type, language, active, config) VALUES
('@inflotnews', 'https://t.me/inflotnews', 'TELEGRAM', 'ARMENIAN', true, '{"subscribers": 45000, "category": "news"}'),
('@bagramyan26', 'https://t.me/bagramyan26', 'TELEGRAM', 'ARMENIAN', true, '{"subscribers": 28000, "category": "political"}'),
('@civilaborak', 'https://t.me/civilaborak', 'TELEGRAM', 'ARMENIAN', true, '{"subscribers": 15000, "category": "opposition"}'),
('@arcakhpress', 'https://t.me/arcakhpress', 'TELEGRAM', 'ARMENIAN', true, '{"subscribers": 41000, "category": "artsakh"}'),
('@military_arm', 'https://t.me/military_arm', 'TELEGRAM', 'ARMENIAN', true, '{"subscribers": 52000, "category": "military"}')
ON CONFLICT (url) DO NOTHING;

-- Update source stats
UPDATE sources SET last_fetched = NOW() - (random() * interval '2 hours'), last_success = NOW() - (random() * interval '2 hours') WHERE active = true AND last_fetched IS NULL;

-- ============================================
-- NARRATIVES: Election-Related Disinformation
-- ============================================

INSERT INTO narratives (name, description, keywords, status, threat_level, article_count, alert_count, first_seen, last_seen) VALUES
(
    'Election Fraud Claims',
    'Coordinated claims suggesting election results will be falsified or manipulated. Spreading distrust in electoral process.',
    ARRAY['fraud', 'falsification', 'rigged', 'stolen election', 'CEC manipulation', 'ballot stuffing'],
    'ACTIVE',
    'HIGH',
    47,
    3,
    NOW() - interval '12 days',
    NOW() - interval '30 minutes'
),
(
    'Foreign Interference - West',
    'Narratives claiming Western powers (US, EU) are manipulating Armenian elections to install puppet government.',
    ARRAY['Soros', 'Western puppets', 'EU interference', 'American influence', 'NGO manipulation', 'color revolution'],
    'ACTIVE',
    'MEDIUM',
    35,
    2,
    NOW() - interval '20 days',
    NOW() - interval '2 hours'
),
(
    'Foreign Interference - Russia',
    'Claims that Russia is attempting to influence elections through media, economic pressure, or direct interference.',
    ARRAY['Russian interference', 'Moscow pressure', 'Kremlin', 'Russian influence', 'CSTO'],
    'ACTIVE',
    'MEDIUM',
    28,
    1,
    NOW() - interval '15 days',
    NOW() - interval '4 hours'
),
(
    'Voter Suppression',
    'Messaging designed to discourage voter participation through claims that voting is pointless or dangerous.',
    ARRAY['dont vote', 'boycott', 'pointless', 'rigged anyway', 'waste of time', 'stay home'],
    'ACTIVE',
    'HIGH',
    23,
    2,
    NOW() - interval '8 days',
    NOW() - interval '1 hour'
),
(
    'Candidate Disinformation',
    'False or misleading claims about specific candidates, including fabricated scandals and manipulated content.',
    ARRAY['scandal', 'corruption', 'leaked', 'secret meeting', 'bribe', 'offshore', 'fake diploma'],
    'ACTIVE',
    'CRITICAL',
    62,
    5,
    NOW() - interval '25 days',
    NOW() - interval '15 minutes'
),
(
    'Security Threat Narratives',
    'Exaggerated or false security threats designed to create fear and influence voting behavior.',
    ARRAY['war threat', 'Azerbaijan attack', 'security crisis', 'military danger', 'border incident'],
    'MONITORING',
    'MEDIUM',
    18,
    1,
    NOW() - interval '10 days',
    NOW() - interval '6 hours'
),
(
    'Economic Collapse Claims',
    'Narratives predicting economic disaster tied to specific election outcomes.',
    ARRAY['economic collapse', 'currency crash', 'dram devaluation', 'bankruptcy', 'poverty increase'],
    'MONITORING',
    'LOW',
    12,
    0,
    NOW() - interval '18 days',
    NOW() - interval '1 day'
),
(
    'Media Censorship Claims',
    'Claims that media is being censored or controlled to hide truth from voters.',
    ARRAY['censorship', 'blocked', 'silenced', 'media control', 'propaganda', 'hidden truth'],
    'ACTIVE',
    'LOW',
    15,
    1,
    NOW() - interval '14 days',
    NOW() - interval '3 hours'
)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    keywords = EXCLUDED.keywords,
    status = EXCLUDED.status,
    threat_level = EXCLUDED.threat_level,
    article_count = EXCLUDED.article_count,
    alert_count = EXCLUDED.alert_count,
    first_seen = EXCLUDED.first_seen,
    last_seen = EXCLUDED.last_seen;

-- ============================================
-- ARTICLES: Sample Content
-- ============================================

-- Insert sample articles using the first active source
INSERT INTO articles (source_id, external_id, title, content, url, published_at, created_at)
SELECT
    (SELECT id FROM sources WHERE active = true LIMIT 1),
    'demo-001',
    'CEC Announces Final Candidate Registration Numbers',
    'The Central Electoral Commission announced today that 12 political parties and 3 electoral blocs have completed registration for the upcoming parliamentary elections. Commission chair noted that all registration requirements were met according to electoral code.',
    'https://example.com/article/1',
    NOW() - interval '2 days',
    NOW() - interval '2 days'
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE external_id = 'demo-001');

INSERT INTO articles (source_id, external_id, title, content, url, published_at, created_at)
SELECT
    (SELECT id FROM sources WHERE active = true LIMIT 1),
    'demo-002',
    'International Observers Arrive for Election Monitoring',
    'OSCE/ODIHR mission has deployed 250 observers across Armenia to monitor the electoral process. The mission head stated they will assess all aspects of the election including campaign environment and media coverage.',
    'https://example.com/article/2',
    NOW() - interval '1 day',
    NOW() - interval '1 day'
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE external_id = 'demo-002');

INSERT INTO articles (source_id, external_id, title, content, url, published_at, created_at)
SELECT
    (SELECT id FROM sources WHERE active = true LIMIT 1),
    'demo-003',
    'Investigation: Suspicious Campaign Financing Patterns',
    'Our investigation reveals unusual patterns in campaign financing for several major parties. Large donations from offshore entities raise questions about transparency in the electoral process.',
    'https://example.com/article/3',
    NOW() - interval '4 days',
    NOW() - interval '4 days'
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE external_id = 'demo-003');

INSERT INTO articles (source_id, external_id, title, content, url, published_at, created_at)
SELECT
    (SELECT id FROM sources WHERE active = true LIMIT 1),
    'demo-004',
    'Opposition Claims Voter Lists Contain Irregularities',
    'Opposition parties have submitted complaints about alleged irregularities in voter registration lists, claiming thousands of deceased individuals remain on rolls. CEC has promised to investigate.',
    'https://example.com/article/4',
    NOW() - interval '12 hours',
    NOW() - interval '12 hours'
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE external_id = 'demo-004');

INSERT INTO articles (source_id, external_id, title, content, url, published_at, created_at)
SELECT
    (SELECT id FROM sources WHERE type = 'TELEGRAM' LIMIT 1),
    'demo-005',
    'URGENT: Reports of Ballot Papers Found Outside Polling Station',
    'Unverified reports circulating about blank ballot papers allegedly found near a polling station in Syunik region. Authorities have not confirmed the reports.',
    'https://t.me/example/123',
    NOW() - interval '6 hours',
    NOW() - interval '6 hours'
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE external_id = 'demo-005');

INSERT INTO articles (source_id, external_id, title, content, url, published_at, created_at)
SELECT
    (SELECT id FROM sources WHERE name LIKE '%Sputnik%' OR type = 'RSS' LIMIT 1),
    'demo-006',
    'Western NGOs Spending Millions to Influence Armenian Voters',
    'According to sources, Western-funded NGOs have allocated unprecedented budgets for voter manipulation campaigns ahead of elections. Critics say this represents interference in sovereign affairs.',
    'https://example.com/article/6',
    NOW() - interval '5 days',
    NOW() - interval '5 days'
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE external_id = 'demo-006');

INSERT INTO articles (source_id, external_id, title, content, url, published_at, created_at)
SELECT
    (SELECT id FROM sources WHERE type = 'TELEGRAM' LIMIT 1),
    'demo-007',
    'LEAKED: Secret Recording Shows Election Deal',
    'A purported leaked recording allegedly shows officials discussing predetermined election results. The authenticity of the recording has not been verified by independent sources.',
    'https://t.me/example/456',
    NOW() - interval '1 day',
    NOW() - interval '1 day'
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE external_id = 'demo-007');

INSERT INTO articles (source_id, external_id, title, content, url, published_at, created_at)
SELECT
    (SELECT id FROM sources WHERE type = 'TELEGRAM' LIMIT 1),
    'demo-008',
    'Why Voting Does Not Matter This Election',
    'Analysis of why participation in the electoral process is futile given the predetermined outcomes. The system is designed to maintain power regardless of votes.',
    'https://t.me/example/789',
    NOW() - interval '2 days',
    NOW() - interval '2 days'
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE external_id = 'demo-008');

INSERT INTO articles (source_id, external_id, title, content, url, published_at, created_at)
SELECT
    (SELECT id FROM sources WHERE active = true LIMIT 1),
    'demo-009',
    'Youth Voter Registration Reaches Record Levels',
    'First-time voter registration has reached historic highs, with over 120,000 young Armenians registering to vote. Civil society organizations credit education campaigns for the increase.',
    'https://example.com/article/9',
    NOW() - interval '3 days',
    NOW() - interval '3 days'
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE external_id = 'demo-009');

INSERT INTO articles (source_id, external_id, title, content, url, published_at, created_at)
SELECT
    (SELECT id FROM sources WHERE active = true LIMIT 1),
    'demo-010',
    'Fact-Check: Viral Claims About Candidate Proven False',
    'A viral social media post claiming a leading candidate has offshore accounts has been debunked. Document analysis shows the evidence was fabricated using image manipulation.',
    'https://example.com/article/10',
    NOW() - interval '1 day',
    NOW() - interval '1 day'
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE external_id = 'demo-010');

INSERT INTO articles (source_id, external_id, title, content, url, published_at, created_at)
SELECT
    (SELECT id FROM sources WHERE active = true LIMIT 1),
    'demo-011',
    'Election Campaign Enters Final Week',
    'With one week remaining before polls open, candidates are intensifying campaign activities across all regions. Public debates are scheduled for the coming days.',
    'https://example.com/article/11',
    NOW() - interval '8 hours',
    NOW() - interval '8 hours'
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE external_id = 'demo-011');

INSERT INTO articles (source_id, external_id, title, content, url, published_at, created_at)
SELECT
    (SELECT id FROM sources WHERE active = true LIMIT 1),
    'demo-012',
    'Diaspora Voting Centers Open in 15 Countries',
    'Armenian diplomatic missions have opened early voting centers for diaspora voters in 15 countries. Over 30,000 diaspora Armenians are expected to participate.',
    'https://example.com/article/12',
    NOW() - interval '2 hours',
    NOW() - interval '2 hours'
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE external_id = 'demo-012');

-- ============================================
-- SENTIMENT RESULTS
-- ============================================

INSERT INTO sentiment_results (article_id, sentiment, confidence, model_version, reasoning)
SELECT a.id,
    CASE
        WHEN a.title ILIKE '%fraud%' OR a.title ILIKE '%suspicious%' OR a.title ILIKE '%irregularities%' OR a.title ILIKE '%LEAKED%' OR a.title ILIKE '%Does Not Matter%' THEN 'NEGATIVE'
        WHEN a.title ILIKE '%record%' OR a.title ILIKE '%secure%' OR a.title ILIKE '%debunked%' OR a.title ILIKE '%youth%' OR a.title ILIKE '%Diaspora%' THEN 'POSITIVE'
        ELSE 'NEUTRAL'
    END,
    0.75 + (random() * 0.2),
    'claude-3-haiku',
    'Automated sentiment analysis based on content indicators'
FROM articles a
WHERE a.external_id LIKE 'demo-%'
AND NOT EXISTS (SELECT 1 FROM sentiment_results sr WHERE sr.article_id = a.id)
ON CONFLICT (article_id, model_version) DO NOTHING;

-- ============================================
-- ARTICLE-NARRATIVE ASSOCIATIONS
-- ============================================

INSERT INTO article_narratives (article_id, narrative_id, confidence, detected_at)
SELECT a.id, n.id, 0.85, a.created_at
FROM articles a, narratives n
WHERE a.external_id = 'demo-005' AND n.name = 'Election Fraud Claims'
AND NOT EXISTS (SELECT 1 FROM article_narratives an WHERE an.article_id = a.id AND an.narrative_id = n.id);

INSERT INTO article_narratives (article_id, narrative_id, confidence, detected_at)
SELECT a.id, n.id, 0.8, a.created_at
FROM articles a, narratives n
WHERE a.external_id = 'demo-006' AND n.name = 'Foreign Interference - West'
AND NOT EXISTS (SELECT 1 FROM article_narratives an WHERE an.article_id = a.id AND an.narrative_id = n.id);

INSERT INTO article_narratives (article_id, narrative_id, confidence, detected_at)
SELECT a.id, n.id, 0.9, a.created_at
FROM articles a, narratives n
WHERE a.external_id = 'demo-007' AND n.name = 'Candidate Disinformation'
AND NOT EXISTS (SELECT 1 FROM article_narratives an WHERE an.article_id = a.id AND an.narrative_id = n.id);

INSERT INTO article_narratives (article_id, narrative_id, confidence, detected_at)
SELECT a.id, n.id, 0.95, a.created_at
FROM articles a, narratives n
WHERE a.external_id = 'demo-008' AND n.name = 'Voter Suppression'
AND NOT EXISTS (SELECT 1 FROM article_narratives an WHERE an.article_id = a.id AND an.narrative_id = n.id);

-- ============================================
-- THREAT ALERTS
-- ============================================

INSERT INTO threat_alerts (narrative_id, alert_type, severity, title, description, status, triggered_at, metadata)
SELECT
    n.id,
    'VOLUME_SPIKE',
    'HIGH',
    'Spike in Election Fraud Narrative',
    '3.2x increase in content volume detected over past 2 hours. 15 new articles/posts identified across 8 sources.',
    'ACTIVE',
    NOW() - interval '2 hours',
    '{"volume_increase": 3.2, "sources_affected": 8, "content_count": 15}'::jsonb
FROM narratives n WHERE n.name = 'Election Fraud Claims'
AND NOT EXISTS (SELECT 1 FROM threat_alerts ta WHERE ta.narrative_id = n.id AND ta.title = 'Spike in Election Fraud Narrative');

INSERT INTO threat_alerts (narrative_id, alert_type, severity, title, description, status, triggered_at, metadata)
SELECT
    n.id,
    'CROSS_PLATFORM',
    'CRITICAL',
    'Coordinated Candidate Attack Detected',
    'Synchronized posting of unverified claims across Telegram channels and news sites. Pattern suggests coordinated campaign.',
    'ACTIVE',
    NOW() - interval '45 minutes',
    '{"platforms": ["telegram", "news"], "coordination_score": 0.87, "accounts_involved": 12}'::jsonb
FROM narratives n WHERE n.name = 'Candidate Disinformation'
AND NOT EXISTS (SELECT 1 FROM threat_alerts ta WHERE ta.narrative_id = n.id AND ta.title = 'Coordinated Candidate Attack Detected');

INSERT INTO threat_alerts (narrative_id, alert_type, severity, title, description, status, triggered_at, metadata)
SELECT
    n.id,
    'NEW_NARRATIVE',
    'MEDIUM',
    'New Voter Suppression Campaign Emerging',
    'Detected new messaging pattern encouraging election boycott. Content spreading primarily through Telegram.',
    'ACKNOWLEDGED',
    NOW() - interval '6 hours',
    '{"first_detected": "telegram", "spread_rate": "moderate", "reach_estimate": 25000}'::jsonb
FROM narratives n WHERE n.name = 'Voter Suppression'
AND NOT EXISTS (SELECT 1 FROM threat_alerts ta WHERE ta.narrative_id = n.id AND ta.title = 'New Voter Suppression Campaign Emerging');

INSERT INTO threat_alerts (narrative_id, alert_type, severity, title, description, status, triggered_at, metadata)
SELECT
    n.id,
    'VOLUME_SPIKE',
    'MEDIUM',
    'Western Interference Claims Increasing',
    '2.1x volume increase in anti-Western content. Primarily from Russian-language sources.',
    'RESOLVED',
    NOW() - interval '1 day',
    '{"volume_increase": 2.1, "primary_language": "russian", "resolved_by": "natural_decline"}'::jsonb
FROM narratives n WHERE n.name = 'Foreign Interference - West'
AND NOT EXISTS (SELECT 1 FROM threat_alerts ta WHERE ta.narrative_id = n.id AND ta.title = 'Western Interference Claims Increasing');

INSERT INTO threat_alerts (narrative_id, alert_type, severity, title, description, status, triggered_at, metadata)
SELECT
    n.id,
    'VIRAL',
    'HIGH',
    'Viral Fake Document Spreading',
    'Manipulated document purporting to show election fraud is going viral. Over 50K views in 3 hours.',
    'ACTIVE',
    NOW() - interval '3 hours',
    '{"content_type": "document", "views": 52000, "shares": 3400, "debunked": false}'::jsonb
FROM narratives n WHERE n.name = 'Election Fraud Claims'
AND NOT EXISTS (SELECT 1 FROM threat_alerts ta WHERE ta.narrative_id = n.id AND ta.title = 'Viral Fake Document Spreading');

-- ============================================
-- UPDATE STATISTICS
-- ============================================

-- Update narrative alert counts
UPDATE narratives SET alert_count = (
    SELECT COUNT(*) FROM threat_alerts ta WHERE ta.narrative_id = narratives.id
);
