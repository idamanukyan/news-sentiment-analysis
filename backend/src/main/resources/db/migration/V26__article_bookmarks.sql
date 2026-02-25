-- Article Bookmarks Feature
-- Allows users to bookmark articles for later reference

CREATE TABLE IF NOT EXISTS article_bookmarks (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    article_id BIGINT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, article_id)
);

CREATE INDEX idx_bookmarks_user_created ON article_bookmarks(user_id, created_at DESC);
