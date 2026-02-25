-- Fact-Check Linking Feature
-- Allows CivilNet to connect their published fact-checks to tracked narratives

CREATE TABLE IF NOT EXISTS fact_checks (
    id BIGSERIAL PRIMARY KEY,
    narrative_id BIGINT REFERENCES narratives(id) ON DELETE CASCADE,
    organization_id BIGINT NOT NULL REFERENCES organizations(id),
    title VARCHAR(500) NOT NULL,
    url VARCHAR(1000) NOT NULL,
    publisher VARCHAR(200) DEFAULT 'CivilNet',
    verdict VARCHAR(50), -- 'FALSE', 'MISLEADING', 'PARTLY_TRUE', 'TRUE', 'UNVERIFIED'
    published_at TIMESTAMP WITH TIME ZONE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    added_by VARCHAR(100),
    notes TEXT
);

CREATE INDEX idx_factchecks_narrative ON fact_checks(narrative_id);
CREATE INDEX idx_factchecks_organization ON fact_checks(organization_id);
CREATE INDEX idx_factchecks_verdict ON fact_checks(verdict);
