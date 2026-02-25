-- V14: Add English translation columns for improved narrative matching
-- Articles are primarily in Armenian/Russian - we translate to English for clustering

-- Add translation columns to articles
ALTER TABLE articles ADD COLUMN IF NOT EXISTS title_en TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS content_en TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS detected_language VARCHAR(10) DEFAULT 'hy';
ALTER TABLE articles ADD COLUMN IF NOT EXISTS translated_at TIMESTAMPTZ;

-- Note: llm_keywords from V11 already stores English keywords
-- We keep keywords_en as alias reference but don't duplicate the column

-- Index for finding untranslated articles
CREATE INDEX IF NOT EXISTS idx_articles_untranslated
    ON articles(id) WHERE translated_at IS NULL;

-- Index for language-specific queries
CREATE INDEX IF NOT EXISTS idx_articles_language ON articles(detected_language);

-- Full-text search index on English content for better narrative matching
ALTER TABLE articles ADD COLUMN IF NOT EXISTS search_vector_en tsvector;
CREATE INDEX IF NOT EXISTS idx_articles_search_en ON articles USING GIN(search_vector_en);

-- Trigger to auto-update English search vector
CREATE OR REPLACE FUNCTION articles_search_en_trigger() RETURNS trigger AS $$
BEGIN
    IF NEW.title_en IS NOT NULL OR NEW.content_en IS NOT NULL THEN
        NEW.search_vector_en := to_tsvector('english',
            COALESCE(NEW.title_en, '') || ' ' || COALESCE(NEW.content_en, ''));
    END IF;
    RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS articles_search_en_update ON articles;
CREATE TRIGGER articles_search_en_update
    BEFORE INSERT OR UPDATE ON articles
    FOR EACH ROW EXECUTE FUNCTION articles_search_en_trigger();

-- Comments
COMMENT ON COLUMN articles.title_en IS 'English translation of title for cross-article matching';
COMMENT ON COLUMN articles.content_en IS 'English translation of content for narrative clustering';
COMMENT ON COLUMN articles.detected_language IS 'ISO 639-1 language code: hy=Armenian, ru=Russian, en=English';
COMMENT ON COLUMN articles.translated_at IS 'Timestamp when article was translated to English';
COMMENT ON COLUMN articles.search_vector_en IS 'Full-text search vector for English content';
