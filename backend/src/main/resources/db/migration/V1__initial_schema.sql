-- News Sentiment Analysis Platform - Initial Schema
-- Version: 1.0
-- Date: 2026-02

-- Sources table
CREATE TABLE sources (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL,
    type VARCHAR(50) NOT NULL,
    language VARCHAR(20) NOT NULL,
    config JSONB,
    active BOOLEAN DEFAULT true NOT NULL,
    last_fetched TIMESTAMPTZ,
    last_success TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT chk_source_type CHECK (type IN ('RSS', 'WEB_SCRAPE', 'TELEGRAM')),
    CONSTRAINT chk_source_language CHECK (language IN ('ARMENIAN', 'RUSSIAN', 'ENGLISH'))
);

CREATE INDEX idx_sources_active ON sources(active);
CREATE INDEX idx_sources_type ON sources(type);
CREATE INDEX idx_sources_language ON sources(language);

-- Articles table
CREATE TABLE articles (
    id BIGSERIAL PRIMARY KEY,
    source_id BIGINT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    external_id VARCHAR(500),
    title TEXT NOT NULL,
    content TEXT,
    url VARCHAR(500),
    author VARCHAR(255),
    published_at TIMESTAMPTZ,
    fetched_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    content_hash VARCHAR(64),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_article_source_external UNIQUE (source_id, external_id)
);

CREATE INDEX idx_articles_source_published ON articles(source_id, published_at DESC);
CREATE INDEX idx_articles_content_hash ON articles(content_hash);
CREATE INDEX idx_articles_published_at ON articles(published_at DESC);
CREATE INDEX idx_articles_fetched_at ON articles(fetched_at DESC);

-- Full-text search for articles
ALTER TABLE articles ADD COLUMN search_vector tsvector;
CREATE INDEX idx_articles_search ON articles USING GIN(search_vector);

CREATE OR REPLACE FUNCTION articles_search_trigger() RETURNS trigger AS $$
BEGIN
    NEW.search_vector := to_tsvector('simple', COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.content, ''));
    RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER articles_search_update
    BEFORE INSERT OR UPDATE ON articles
    FOR EACH ROW EXECUTE FUNCTION articles_search_trigger();

-- Sentiment results table
CREATE TABLE sentiment_results (
    id BIGSERIAL PRIMARY KEY,
    article_id BIGINT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    sentiment VARCHAR(20) NOT NULL,
    confidence DECIMAL(3,2),
    model_version VARCHAR(50),
    reasoning TEXT,
    topics TEXT[],
    entities JSONB,
    processed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT chk_sentiment CHECK (sentiment IN ('POSITIVE', 'NEGATIVE', 'NEUTRAL')),
    CONSTRAINT uq_sentiment_article_model UNIQUE (article_id, model_version)
);

CREATE INDEX idx_sentiment_article ON sentiment_results(article_id);
CREATE INDEX idx_sentiment_processed ON sentiment_results(processed_at DESC);
CREATE INDEX idx_sentiment_sentiment ON sentiment_results(sentiment);

-- Users table
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'USER',
    organization_id BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    last_login TIMESTAMPTZ,
    enabled BOOLEAN DEFAULT true NOT NULL,
    CONSTRAINT chk_user_role CHECK (role IN ('USER', 'ADMIN', 'LABELER'))
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_organization ON users(organization_id);

-- Topics table
CREATE TABLE topics (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    keywords TEXT[] NOT NULL,
    source_ids BIGINT[],
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_topics_user ON topics(user_id);

-- Alerts table
CREATE TABLE alerts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic_id BIGINT REFERENCES topics(id) ON DELETE SET NULL,
    condition JSONB NOT NULL,
    channel VARCHAR(50) NOT NULL,
    active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT chk_alert_channel CHECK (channel IN ('EMAIL', 'WEBHOOK'))
);

CREATE INDEX idx_alerts_user ON alerts(user_id);
CREATE INDEX idx_alerts_active ON alerts(active);

-- Labels table (for human-verified sentiment)
CREATE TABLE labels (
    id BIGSERIAL PRIMARY KEY,
    article_id BIGINT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    labeler_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sentiment VARCHAR(20) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT chk_label_sentiment CHECK (sentiment IN ('POSITIVE', 'NEGATIVE', 'NEUTRAL')),
    CONSTRAINT uq_label_article_labeler UNIQUE (article_id, labeler_id)
);

CREATE INDEX idx_labels_article ON labels(article_id);
CREATE INDEX idx_labels_labeler ON labels(labeler_id);

-- Subscriptions table (for billing)
CREATE TABLE subscriptions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    plan VARCHAR(50),
    status VARCHAR(50),
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
