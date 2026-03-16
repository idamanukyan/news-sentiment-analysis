-- Add AI summary columns for narrative analysis
-- The ai_summary column stores a JSON object with structured analysis fields

ALTER TABLE narratives ADD COLUMN ai_summary JSONB;
ALTER TABLE narratives ADD COLUMN ai_summary_generated_at TIMESTAMPTZ;

COMMENT ON COLUMN narratives.ai_summary IS 'AI-generated analysis JSON with fields: why_detected, spread_pattern, threat_signal, suggested_title, analyst_note';
COMMENT ON COLUMN narratives.ai_summary_generated_at IS 'Timestamp when the AI summary was generated';

-- Index for querying narratives that have/don't have AI summaries
CREATE INDEX idx_narratives_ai_summary_generated ON narratives(ai_summary_generated_at) WHERE ai_summary_generated_at IS NOT NULL;
