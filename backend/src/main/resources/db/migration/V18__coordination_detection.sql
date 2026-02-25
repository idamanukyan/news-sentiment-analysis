-- Coordination detection tables
-- Detects when multiple sources publish suspiciously similar content within a short time window

-- Coordination events table
CREATE TABLE IF NOT EXISTS coordination_events (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id),
    narrative_id BIGINT REFERENCES narratives(id) ON DELETE SET NULL,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    time_window_hours INTEGER NOT NULL,
    source_count INTEGER NOT NULL,
    article_count INTEGER NOT NULL,
    similarity_score DOUBLE PRECISION,
    coordination_type VARCHAR(50) NOT NULL, -- 'TIMING', 'CONTENT', 'TIMING_AND_CONTENT'
    description TEXT,
    sources_involved JSONB, -- ["source1", "source2", ...]
    article_ids JSONB,      -- [1, 2, 3, ...]
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, REVIEWED, DISMISSED
    reviewed_at TIMESTAMPTZ,
    reviewed_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_coordination_type CHECK (coordination_type IN ('TIMING', 'CONTENT', 'TIMING_AND_CONTENT')),
    CONSTRAINT chk_coordination_status CHECK (status IN ('ACTIVE', 'REVIEWED', 'DISMISSED'))
);

-- Add coordination columns to articles for quick lookup
ALTER TABLE articles ADD COLUMN IF NOT EXISTS coordination_score DOUBLE PRECISION;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS coordination_event_id BIGINT REFERENCES coordination_events(id) ON DELETE SET NULL;

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_coordination_events_narrative ON coordination_events(narrative_id);
CREATE INDEX IF NOT EXISTS idx_coordination_events_detected ON coordination_events(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_coordination_events_status ON coordination_events(status);
CREATE INDEX IF NOT EXISTS idx_coordination_events_org ON coordination_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_coordination_events_org_status ON coordination_events(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_articles_coordination_event ON articles(coordination_event_id) WHERE coordination_event_id IS NOT NULL;

-- Comments for documentation
COMMENT ON TABLE coordination_events IS 'Stores detected coordination patterns across sources';
COMMENT ON COLUMN coordination_events.coordination_type IS 'Type of coordination: TIMING (close publication times), CONTENT (similar content), or TIMING_AND_CONTENT (both)';
COMMENT ON COLUMN coordination_events.similarity_score IS 'Combined coordination score from 0-1, where higher means more suspicious';
COMMENT ON COLUMN coordination_events.sources_involved IS 'JSON array of source names involved in this coordination event';
COMMENT ON COLUMN coordination_events.article_ids IS 'JSON array of article IDs that form this coordination event';
