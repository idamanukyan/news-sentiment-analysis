-- Alert Assignment Feature
-- Adds assignment, priority, and notes fields to threat_alerts

ALTER TABLE threat_alerts ADD COLUMN IF NOT EXISTS assigned_to VARCHAR(100);
ALTER TABLE threat_alerts ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE threat_alerts ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;
ALTER TABLE threat_alerts ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE INDEX IF NOT EXISTS idx_alerts_assigned ON threat_alerts(assigned_to);
CREATE INDEX IF NOT EXISTS idx_alerts_priority ON threat_alerts(priority DESC);
