-- V25: Discussion thread enhancements - narrative/alert linking, @mentions
-- Add narrative and alert linking to discussion threads
ALTER TABLE discussion_threads ADD COLUMN IF NOT EXISTS narrative_id BIGINT REFERENCES narratives(id) ON DELETE SET NULL;
ALTER TABLE discussion_threads ADD COLUMN IF NOT EXISTS alert_id BIGINT REFERENCES threat_alerts(id) ON DELETE SET NULL;
ALTER TABLE discussion_threads ADD COLUMN IF NOT EXISTS discussion_type VARCHAR(32) DEFAULT 'GENERAL';

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_discussions_narrative ON discussion_threads(narrative_id);
CREATE INDEX IF NOT EXISTS idx_discussions_alert ON discussion_threads(alert_id);
CREATE INDEX IF NOT EXISTS idx_discussions_type ON discussion_threads(discussion_type);

-- Table for tracking @mentions
CREATE TABLE IF NOT EXISTS discussion_mentions (
    id BIGSERIAL PRIMARY KEY,
    thread_id BIGINT REFERENCES discussion_threads(id) ON DELETE CASCADE,
    reply_id BIGINT REFERENCES discussion_replies(id) ON DELETE CASCADE,
    mentioned_user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    mentioner_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_thread_or_reply CHECK (thread_id IS NOT NULL OR reply_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_mentions_mentioned_user ON discussion_mentions(mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_mentions_unread ON discussion_mentions(mentioned_user_id, is_read) WHERE is_read = FALSE;
