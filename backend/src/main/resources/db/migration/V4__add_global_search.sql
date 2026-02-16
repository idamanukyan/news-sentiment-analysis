-- Add global search capability to topics

-- Add new fields to topics table
ALTER TABLE topics ADD COLUMN IF NOT EXISTS global_search BOOLEAN DEFAULT false;
ALTER TABLE topics ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en';
ALTER TABLE topics ADD COLUMN IF NOT EXISTS search_interval_minutes INTEGER DEFAULT 60;
ALTER TABLE topics ADD COLUMN IF NOT EXISTS last_searched_at TIMESTAMPTZ;

-- Make source_id nullable for global articles (no specific source)
ALTER TABLE articles ALTER COLUMN source_id DROP NOT NULL;

-- Add index for global search topics
CREATE INDEX IF NOT EXISTS idx_topics_global_search ON topics(global_search) WHERE global_search = true;

-- Add topic_id to articles for linking global articles to topics
ALTER TABLE articles ADD COLUMN IF NOT EXISTS topic_id BIGINT REFERENCES topics(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_articles_topic ON articles(topic_id);

-- Comment
COMMENT ON COLUMN topics.global_search IS 'If true, search global news APIs for this topic';
COMMENT ON COLUMN topics.language IS 'Language for global search (en, ru, hy, etc.)';
COMMENT ON COLUMN topics.search_interval_minutes IS 'How often to search for new articles';
