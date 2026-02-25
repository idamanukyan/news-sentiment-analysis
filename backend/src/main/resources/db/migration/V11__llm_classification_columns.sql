-- V11: Add LLM-based topic classification columns
-- These replace the broken TF-IDF clustering with Claude-powered classification

-- Add classification columns to articles
ALTER TABLE articles ADD COLUMN IF NOT EXISTS llm_topic VARCHAR(50);
ALTER TABLE articles ADD COLUMN IF NOT EXISTS llm_keywords TEXT[];
ALTER TABLE articles ADD COLUMN IF NOT EXISTS llm_subtopic VARCHAR(255);
ALTER TABLE articles ADD COLUMN IF NOT EXISTS llm_classified_at TIMESTAMPTZ;

-- Add direct narrative link (replaces article_narratives junction for primary assignment)
ALTER TABLE articles ADD COLUMN IF NOT EXISTS narrative_id BIGINT REFERENCES narratives(id) ON DELETE SET NULL;

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_articles_llm_topic ON articles(llm_topic);
CREATE INDEX IF NOT EXISTS idx_articles_narrative_id ON articles(narrative_id);
CREATE INDEX IF NOT EXISTS idx_articles_llm_classified ON articles(llm_classified_at);

-- Update narratives table with additional tracking columns
ALTER TABLE narratives ADD COLUMN IF NOT EXISTS telegram_count INTEGER DEFAULT 0;
ALTER TABLE narratives ADD COLUMN IF NOT EXISTS avg_sentiment DECIMAL(3,2);
ALTER TABLE narratives ADD COLUMN IF NOT EXISTS source_breakdown JSONB;
ALTER TABLE narratives ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN DEFAULT false;

-- Comments
COMMENT ON COLUMN articles.llm_topic IS 'Topic assigned by Claude: Elections, Foreign Policy, Economy, etc.';
COMMENT ON COLUMN articles.llm_keywords IS 'English keywords extracted by Claude: names, places, events';
COMMENT ON COLUMN articles.llm_subtopic IS 'Brief 3-5 word English description of the specific story';
COMMENT ON COLUMN articles.narrative_id IS 'Primary narrative this article belongs to';
COMMENT ON COLUMN narratives.auto_generated IS 'True if created by LLM clustering pipeline';
