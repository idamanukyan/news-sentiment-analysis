-- Custom alert rules table
CREATE TABLE alert_rules (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    enabled BOOLEAN NOT NULL DEFAULT true,

    -- Rule conditions (stored as JSONB for flexibility)
    conditions JSONB NOT NULL DEFAULT '{}',

    -- Alert configuration
    severity VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    cooldown_minutes INT NOT NULL DEFAULT 60,

    -- Ownership
    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Tracking
    last_triggered_at TIMESTAMP,
    trigger_count INT NOT NULL DEFAULT 0
);

-- Track which alerts were created by which rules
ALTER TABLE threat_alerts ADD COLUMN rule_id BIGINT REFERENCES alert_rules(id) ON DELETE SET NULL;

CREATE INDEX idx_alert_rules_enabled ON alert_rules(enabled);
CREATE INDEX idx_alert_rules_created_by ON alert_rules(created_by);
CREATE INDEX idx_threat_alerts_rule_id ON threat_alerts(rule_id);

COMMENT ON TABLE alert_rules IS 'Custom user-defined alert rules';
COMMENT ON COLUMN alert_rules.conditions IS 'JSON object with rule conditions: keywords (array), sentiment_threshold (0-100), volume_threshold (int), volume_timeframe_hours (int), source_ids (array), source_types (array), match_all (boolean for AND vs OR)';
COMMENT ON COLUMN alert_rules.cooldown_minutes IS 'Minimum time between triggers to avoid alert spam';
