-- V7: Unified content model
-- Adds source_type and platform fields for multi-platform content

ALTER TABLE articles ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) DEFAULT 'NEWS';
ALTER TABLE articles ADD COLUMN IF NOT EXISTS platform VARCHAR(50);
ALTER TABLE articles ADD COLUMN IF NOT EXISTS engagement_count INTEGER DEFAULT 0;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en';

-- Indexes for filtering
CREATE INDEX IF NOT EXISTS idx_articles_source_type ON articles(source_type);
CREATE INDEX IF NOT EXISTS idx_articles_platform ON articles(platform);
CREATE INDEX IF NOT EXISTS idx_articles_language ON articles(language);

-- Update existing articles
UPDATE articles SET source_type = 'NEWS' WHERE source_type IS NULL;
UPDATE articles SET platform = 'web' WHERE platform IS NULL AND source_id IS NOT NULL;

-- Comments
COMMENT ON COLUMN articles.source_type IS 'NEWS, TELEGRAM, SOCIAL, RSS';
COMMENT ON COLUMN articles.platform IS 'web, telegram, facebook, twitter, etc.';
COMMENT ON COLUMN articles.engagement_count IS 'Views, shares, or reactions count';
