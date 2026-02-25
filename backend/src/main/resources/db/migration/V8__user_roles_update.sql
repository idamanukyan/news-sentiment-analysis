-- Update user roles to new ADMIN/ANALYST/VIEWER model

-- Step 1: Drop the old constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_user_role;

-- Step 2: Migrate existing roles
-- USER -> VIEWER, LABELER -> ANALYST, ADMIN stays ADMIN
UPDATE users SET role = 'VIEWER' WHERE role = 'USER';
UPDATE users SET role = 'ANALYST' WHERE role = 'LABELER';

-- Step 3: Add new constraint with updated roles
ALTER TABLE users ADD CONSTRAINT chk_user_role
    CHECK (role IN ('VIEWER', 'ANALYST', 'ADMIN'));

-- Step 4: Update existing test users with AIIM branding
UPDATE users SET email = 'admin@aiim.am', name = 'AIIM Administrator' WHERE email = 'admin@newssentiment.am';
UPDATE users SET email = 'viewer@aiim.am', name = 'Demo Viewer' WHERE email = 'test@newssentiment.am';
UPDATE users SET email = 'analyst@aiim.am', name = 'Demo Analyst' WHERE email = 'labeler@newssentiment.am';

-- Step 5: Insert additional demo accounts if they don't exist
-- Password: testpass123 (BCrypt hashed - same as existing users)
INSERT INTO users (email, password_hash, name, role, enabled)
SELECT 'election.observer@aiim.am', '$2a$10$4nuHBy7r3i6JO5kySN.ZqOqpriaF/ZFVCVAcl97FQep1aJ.bTUTwC', 'Election Observer', 'VIEWER', true
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'election.observer@aiim.am');

INSERT INTO users (email, password_hash, name, role, enabled)
SELECT 'factchecker@aiim.am', '$2a$10$4nuHBy7r3i6JO5kySN.ZqOqpriaF/ZFVCVAcl97FQep1aJ.bTUTwC', 'InFact Analyst', 'ANALYST', true
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'factchecker@aiim.am');

INSERT INTO users (email, password_hash, name, role, enabled)
SELECT 'cso.partner@aiim.am', '$2a$10$4nuHBy7r3i6JO5kySN.ZqOqpriaF/ZFVCVAcl97FQep1aJ.bTUTwC', 'CSO Partner', 'ANALYST', true
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'cso.partner@aiim.am');

-- Step 6: Add index on role for faster queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
