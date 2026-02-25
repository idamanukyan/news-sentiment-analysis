-- Multi-Tenancy Support Migration
-- Adds organization-based data isolation for SaaS readiness

-- Organizations table
CREATE TABLE organizations (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    slug VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    tier VARCHAR(20) NOT NULL DEFAULT 'FREE',
    active BOOLEAN NOT NULL DEFAULT true,
    max_users INTEGER DEFAULT 5,
    max_sources INTEGER DEFAULT 10,
    max_narratives INTEGER DEFAULT 20,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    CONSTRAINT chk_org_tier CHECK (tier IN ('FREE', 'STANDARD', 'ENTERPRISE'))
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_active ON organizations(active);

-- Create default organization for existing data migration
INSERT INTO organizations (name, slug, description, tier, max_users, max_sources, max_narratives)
VALUES ('AIIM Default', 'aiim-default', 'Default organization for Armenia Information Integrity Monitor', 'ENTERPRISE', 100, 1000, 1000);

-- Users table: Add FK constraint to existing organization_id column
-- First, migrate existing users to default org
UPDATE users SET organization_id = 1 WHERE organization_id IS NULL;

-- Make organization_id NOT NULL and add FK
ALTER TABLE users ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE users
    ADD CONSTRAINT fk_users_organization
    FOREIGN KEY (organization_id) REFERENCES organizations(id);

-- Sources table
ALTER TABLE sources ADD COLUMN organization_id BIGINT;
UPDATE sources SET organization_id = 1;
ALTER TABLE sources ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE sources
    ADD CONSTRAINT fk_sources_organization
    FOREIGN KEY (organization_id) REFERENCES organizations(id);
CREATE INDEX idx_sources_organization ON sources(organization_id);

-- Narratives table
ALTER TABLE narratives ADD COLUMN organization_id BIGINT;
UPDATE narratives SET organization_id = 1;
ALTER TABLE narratives ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE narratives
    ADD CONSTRAINT fk_narratives_organization
    FOREIGN KEY (organization_id) REFERENCES organizations(id);
CREATE INDEX idx_narratives_organization ON narratives(organization_id);

-- Make narrative name unique per org (remove global uniqueness if exists)
ALTER TABLE narratives DROP CONSTRAINT IF EXISTS narratives_name_key;
ALTER TABLE narratives DROP CONSTRAINT IF EXISTS uq_narrative_name;
CREATE UNIQUE INDEX uq_narrative_org_name ON narratives(organization_id, name);

-- Threat alerts table
ALTER TABLE threat_alerts ADD COLUMN organization_id BIGINT;
UPDATE threat_alerts SET organization_id = 1;
ALTER TABLE threat_alerts ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE threat_alerts
    ADD CONSTRAINT fk_threat_alerts_organization
    FOREIGN KEY (organization_id) REFERENCES organizations(id);
CREATE INDEX idx_threat_alerts_organization ON threat_alerts(organization_id);

-- Alert rules table
ALTER TABLE alert_rules ADD COLUMN organization_id BIGINT;
UPDATE alert_rules SET organization_id = 1;
ALTER TABLE alert_rules ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE alert_rules
    ADD CONSTRAINT fk_alert_rules_organization
    FOREIGN KEY (organization_id) REFERENCES organizations(id);
CREATE INDEX idx_alert_rules_organization ON alert_rules(organization_id);

-- Topics table (already user-scoped, add org for consistency)
ALTER TABLE topics ADD COLUMN organization_id BIGINT;
-- Populate from user's organization
UPDATE topics t SET organization_id = (SELECT organization_id FROM users u WHERE u.id = t.user_id);
-- Handle any null cases (shouldn't happen, but safety first)
UPDATE topics SET organization_id = 1 WHERE organization_id IS NULL;
ALTER TABLE topics ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE topics
    ADD CONSTRAINT fk_topics_organization
    FOREIGN KEY (organization_id) REFERENCES organizations(id);
CREATE INDEX idx_topics_organization ON topics(organization_id);

-- Alerts table (user notification configs)
ALTER TABLE alerts ADD COLUMN organization_id BIGINT;
-- Populate from user's organization
UPDATE alerts a SET organization_id = (SELECT organization_id FROM users u WHERE u.id = a.user_id);
UPDATE alerts SET organization_id = 1 WHERE organization_id IS NULL;
ALTER TABLE alerts ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE alerts
    ADD CONSTRAINT fk_alerts_organization
    FOREIGN KEY (organization_id) REFERENCES organizations(id);
CREATE INDEX idx_alerts_organization ON alerts(organization_id);

-- Note: Articles do NOT need organization_id
-- They are implicitly scoped via their source (source.organization_id)
