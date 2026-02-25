-- User Management: New Roles and Discussion Feature
-- Adds SUPER_ADMIN and ORG_ADMIN roles, discussion threads for team collaboration

-- Drop the existing role constraint to add new role values
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_user_role;

-- Update existing ADMIN users to ORG_ADMIN
UPDATE users SET role = 'ORG_ADMIN' WHERE role = 'ADMIN';

-- Set platform super admin
UPDATE users SET role = 'SUPER_ADMIN' WHERE email = 'admin@aiim.am';

-- Recreate the constraint with new role values
ALTER TABLE users ADD CONSTRAINT chk_user_role
    CHECK (role IN ('SUPER_ADMIN', 'ORG_ADMIN', 'ANALYST', 'VIEWER'));

-- Discussion threads table
CREATE TABLE discussion_threads (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id),
    author_id BIGINT NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    pinned BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE INDEX idx_discussion_threads_org ON discussion_threads(organization_id);
CREATE INDEX idx_discussion_threads_author ON discussion_threads(author_id);
CREATE INDEX idx_discussion_threads_pinned ON discussion_threads(organization_id, pinned DESC, created_at DESC);

-- Discussion replies table
CREATE TABLE discussion_replies (
    id BIGSERIAL PRIMARY KEY,
    thread_id BIGINT NOT NULL REFERENCES discussion_threads(id) ON DELETE CASCADE,
    author_id BIGINT NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE INDEX idx_discussion_replies_thread ON discussion_replies(thread_id);
CREATE INDEX idx_discussion_replies_author ON discussion_replies(author_id);

-- Update max_users based on tier for existing orgs (adjust tier limits)
-- FREE: 3 users, STANDARD: 10 users, ENTERPRISE: unlimited (1000)
UPDATE organizations SET max_users =
    CASE tier
        WHEN 'FREE' THEN 3
        WHEN 'STANDARD' THEN 10
        WHEN 'ENTERPRISE' THEN 1000
        ELSE 3
    END
WHERE max_users = 5; -- Only update if still at default
