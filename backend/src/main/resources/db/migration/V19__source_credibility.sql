-- Source credibility scoring
-- Each source gets a computed reliability score (0.0-1.0) based on historical patterns

ALTER TABLE sources ADD COLUMN IF NOT EXISTS credibility_score DOUBLE PRECISION DEFAULT 0.5;
ALTER TABLE sources ADD COLUMN IF NOT EXISTS credibility_factors JSONB DEFAULT '{}';
ALTER TABLE sources ADD COLUMN IF NOT EXISTS credibility_updated_at TIMESTAMP WITH TIME ZONE;

-- Index for efficient credibility-based queries
CREATE INDEX IF NOT EXISTS idx_sources_credibility_score ON sources(credibility_score);

COMMENT ON COLUMN sources.credibility_score IS 'Computed reliability score 0.0-1.0 based on historical patterns';
COMMENT ON COLUMN sources.credibility_factors IS 'JSON breakdown of scoring factors: sentiment_balance, volume_regularity, narrative_diversity, coordination_clean';
COMMENT ON COLUMN sources.credibility_updated_at IS 'When credibility was last calculated';
