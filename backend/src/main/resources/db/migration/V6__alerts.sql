-- V6: Threat alerts system
-- Early warning alerts for narrative spikes and emerging threats
-- Note: Uses 'threat_alerts' to avoid conflict with V1's user notification 'alerts' table

CREATE TABLE threat_alerts (
    id BIGSERIAL PRIMARY KEY,
    narrative_id BIGINT REFERENCES narratives(id) ON DELETE SET NULL,
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    title VARCHAR(500) NOT NULL,
    description TEXT,
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by BIGINT REFERENCES users(id),
    resolved_at TIMESTAMPTZ,
    resolved_by BIGINT REFERENCES users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_threat_alerts_status ON threat_alerts(status);
CREATE INDEX idx_threat_alerts_severity ON threat_alerts(severity);
CREATE INDEX idx_threat_alerts_triggered ON threat_alerts(triggered_at DESC);
CREATE INDEX idx_threat_alerts_narrative ON threat_alerts(narrative_id);
CREATE INDEX idx_threat_alerts_type ON threat_alerts(alert_type);

-- Comments
COMMENT ON TABLE threat_alerts IS 'Early warning alerts for information threats';
COMMENT ON COLUMN threat_alerts.alert_type IS 'VOLUME_SPIKE, NEW_NARRATIVE, CROSS_PLATFORM, COORDINATED, VIRAL';
COMMENT ON COLUMN threat_alerts.severity IS 'LOW, MEDIUM, HIGH, CRITICAL';
COMMENT ON COLUMN threat_alerts.status IS 'ACTIVE, ACKNOWLEDGED, RESOLVED, DISMISSED';
COMMENT ON COLUMN threat_alerts.metadata IS 'Additional context: spike_factor, sources, articles_count, etc.';
