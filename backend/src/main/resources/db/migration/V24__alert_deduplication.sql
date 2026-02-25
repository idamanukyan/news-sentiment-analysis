-- Alert Deduplication and Grouping
-- Adds fields to group similar alerts and track recurrence

-- Add deduplication fields to threat_alerts
ALTER TABLE threat_alerts ADD COLUMN IF NOT EXISTS alert_hash VARCHAR(64);
ALTER TABLE threat_alerts ADD COLUMN IF NOT EXISTS group_id BIGINT;
ALTER TABLE threat_alerts ADD COLUMN IF NOT EXISTS occurrence_count INTEGER DEFAULT 1;
ALTER TABLE threat_alerts ADD COLUMN IF NOT EXISTS last_occurred_at TIMESTAMPTZ;

-- Add foreign key for group_id (self-referencing)
ALTER TABLE threat_alerts
    ADD CONSTRAINT fk_alert_group
    FOREIGN KEY (group_id) REFERENCES threat_alerts(id) ON DELETE SET NULL;

-- Indexes for efficient grouping queries
CREATE INDEX IF NOT EXISTS idx_alerts_hash ON threat_alerts(alert_hash);
CREATE INDEX IF NOT EXISTS idx_alerts_group ON threat_alerts(group_id);
CREATE INDEX IF NOT EXISTS idx_alerts_last_occurred ON threat_alerts(last_occurred_at DESC);

-- Composite index for finding active groups
CREATE INDEX IF NOT EXISTS idx_alerts_hash_status ON threat_alerts(alert_hash, status)
    WHERE status = 'ACTIVE';

-- Add comment explaining the fields
COMMENT ON COLUMN threat_alerts.alert_hash IS 'SHA-256 hash of (narrative_id, alert_type, severity) for grouping similar alerts';
COMMENT ON COLUMN threat_alerts.group_id IS 'Reference to the first (parent) alert in a group of duplicates';
COMMENT ON COLUMN threat_alerts.occurrence_count IS 'Number of times this alert pattern has occurred';
COMMENT ON COLUMN threat_alerts.last_occurred_at IS 'Timestamp of the most recent occurrence of this alert pattern';
