-- V5: Narratives tracking system
-- Enables tracking of disinformation narratives across content

CREATE TABLE IF NOT EXISTS narratives (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    keywords TEXT[] NOT NULL DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    threat_level VARCHAR(20) NOT NULL DEFAULT 'LOW',
    first_seen TIMESTAMPTZ,
    last_seen TIMESTAMPTZ,
    article_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Junction table for article-narrative associations
CREATE TABLE IF NOT EXISTS article_narratives (
    article_id BIGINT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    narrative_id BIGINT NOT NULL REFERENCES narratives(id) ON DELETE CASCADE,
    confidence DECIMAL(3,2) DEFAULT 1.0,
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (article_id, narrative_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_narratives_status ON narratives(status);
CREATE INDEX IF NOT EXISTS idx_narratives_threat_level ON narratives(threat_level);
CREATE INDEX IF NOT EXISTS idx_narratives_last_seen ON narratives(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_article_narratives_narrative ON article_narratives(narrative_id);
CREATE INDEX IF NOT EXISTS idx_article_narratives_detected ON article_narratives(detected_at DESC);

-- Comments
COMMENT ON TABLE narratives IS 'Tracks disinformation narratives and themes';
COMMENT ON COLUMN narratives.keywords IS 'Keywords used to detect this narrative in content';
COMMENT ON COLUMN narratives.threat_level IS 'LOW, MEDIUM, HIGH, CRITICAL';
COMMENT ON COLUMN narratives.status IS 'ACTIVE, MONITORING, RESOLVED, ARCHIVED';
