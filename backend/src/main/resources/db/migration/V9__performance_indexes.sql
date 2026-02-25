-- Performance indexes for Day 5 stability

-- Articles table - critical for dashboard queries
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_source_id ON articles(source_id);
CREATE INDEX IF NOT EXISTS idx_articles_source_published ON articles(source_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at DESC);

-- Sources table
CREATE INDEX IF NOT EXISTS idx_sources_active_filter ON sources(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_sources_type_idx ON sources(type);

-- Narratives table
CREATE INDEX IF NOT EXISTS idx_narratives_status_threat ON narratives(status, threat_level);
CREATE INDEX IF NOT EXISTS idx_narratives_article_count ON narratives(article_count DESC);

-- Article-Narratives junction table
CREATE INDEX IF NOT EXISTS idx_article_narratives_article ON article_narratives(article_id);
CREATE INDEX IF NOT EXISTS idx_article_narratives_narrative_idx ON article_narratives(narrative_id);

-- Alerts table (threat_alerts) - for dashboard and monitoring
CREATE INDEX IF NOT EXISTS idx_alerts_status_severity ON threat_alerts(status, severity);
CREATE INDEX IF NOT EXISTS idx_alerts_triggered_at ON threat_alerts(triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_narrative_idx ON threat_alerts(narrative_id);

-- Sentiment results
CREATE INDEX IF NOT EXISTS idx_sentiment_results_article_idx ON sentiment_results(article_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_results_sentiment_idx ON sentiment_results(sentiment);

-- Full text search on articles (using pg_trgm if available)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_articles_title_trgm ON articles USING gin(title gin_trgm_ops)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_articles_content_trgm ON articles USING gin(content gin_trgm_ops)';
    END IF;
END $$;
