-- Add user ownership to narratives for sharing feature
-- Narratives will now be user-owned with explicit sharing

-- Add creator tracking to narratives
ALTER TABLE narratives ADD COLUMN created_by BIGINT REFERENCES users(id) ON DELETE SET NULL;

-- Create narrative shares table
CREATE TABLE narrative_shares (
    id BIGSERIAL PRIMARY KEY,
    narrative_id BIGINT NOT NULL REFERENCES narratives(id) ON DELETE CASCADE,
    shared_with_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shared_by_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    can_edit BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(narrative_id, shared_with_user_id)
);

-- Indexes for efficient queries
CREATE INDEX idx_narrative_shares_shared_with ON narrative_shares(shared_with_user_id);
CREATE INDEX idx_narrative_shares_narrative ON narrative_shares(narrative_id);
CREATE INDEX idx_narratives_created_by ON narratives(created_by);

-- Backfill: Set created_by to first admin in each org for existing narratives
UPDATE narratives n
SET created_by = (
    SELECT u.id FROM users u
    WHERE u.organization_id = n.organization_id
    AND u.role IN ('ORG_ADMIN', 'SUPER_ADMIN')
    ORDER BY u.created_at ASC
    LIMIT 1
)
WHERE n.created_by IS NULL;
