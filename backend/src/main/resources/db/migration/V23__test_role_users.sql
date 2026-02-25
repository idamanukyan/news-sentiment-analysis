-- Test Users for Each Role
-- All passwords: Test123!
-- BCrypt hash generated for: Test123!

-- First, ensure we have a test organization
INSERT INTO organizations (name, slug, description, tier, active, max_users, max_sources, max_narratives)
VALUES ('CivilNet', 'civilnet', 'CivilNet Media Organization', 'STANDARD', true, 10, 50, 25)
ON CONFLICT (slug) DO UPDATE SET active = true;

-- Get the org ID for assignment
DO $$
DECLARE
    org_id BIGINT;
    pwd_hash VARCHAR := '$2a$10$N9qo8uLOickgx2ZMRZoHK.ZS7rL9CzGVvnFdLH/8Z3wHN.sWLs8Vy'; -- Test123!
BEGIN
    SELECT id INTO org_id FROM organizations WHERE slug = 'civilnet';

    -- SUPER_ADMIN: Platform owner (no org assignment needed, but we'll use default)
    INSERT INTO users (email, password_hash, name, role, organization_id, enabled)
    VALUES ('super@test.com', pwd_hash, 'Super Admin', 'SUPER_ADMIN', org_id, true)
    ON CONFLICT (email) DO UPDATE SET
        password_hash = pwd_hash,
        role = 'SUPER_ADMIN',
        enabled = true;

    -- ORG_ADMIN: Organization administrator
    INSERT INTO users (email, password_hash, name, role, organization_id, enabled)
    VALUES ('orgadmin@test.com', pwd_hash, 'Org Admin', 'ORG_ADMIN', org_id, true)
    ON CONFLICT (email) DO UPDATE SET
        password_hash = pwd_hash,
        role = 'ORG_ADMIN',
        organization_id = org_id,
        enabled = true;

    -- ANALYST: Full feature access
    INSERT INTO users (email, password_hash, name, role, organization_id, enabled)
    VALUES ('analyst@test.com', pwd_hash, 'Test Analyst', 'ANALYST', org_id, true)
    ON CONFLICT (email) DO UPDATE SET
        password_hash = pwd_hash,
        role = 'ANALYST',
        organization_id = org_id,
        enabled = true;

    -- VIEWER: Read-only access
    INSERT INTO users (email, password_hash, name, role, organization_id, enabled)
    VALUES ('viewer@test.com', pwd_hash, 'Test Viewer', 'VIEWER', org_id, true)
    ON CONFLICT (email) DO UPDATE SET
        password_hash = pwd_hash,
        role = 'VIEWER',
        organization_id = org_id,
        enabled = true;
END $$;
