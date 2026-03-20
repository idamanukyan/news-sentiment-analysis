-- Add relevance_score column to article_narratives junction table
-- Used for AI-evaluated relevance filtering to exclude incorrectly clustered articles

ALTER TABLE article_narratives
ADD COLUMN relevance_score FLOAT NULL;

-- Add index for filtering by relevance
CREATE INDEX idx_article_narratives_relevance ON article_narratives(relevance_score)
WHERE relevance_score IS NOT NULL;

-- Add index for finding unscored pairs
CREATE INDEX idx_article_narratives_unscored ON article_narratives(narrative_id)
WHERE relevance_score IS NULL;

COMMENT ON COLUMN article_narratives.relevance_score IS 'AI-evaluated relevance score (0.0-1.0). NULL = not yet evaluated.';
