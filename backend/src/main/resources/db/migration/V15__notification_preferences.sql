-- Add notification preferences columns to users table
ALTER TABLE users
    ADD COLUMN email_notifications_enabled BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN report_frequency VARCHAR(20) DEFAULT 'WEEKLY',
    ADD COLUMN alert_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN alert_severity_threshold VARCHAR(20) DEFAULT 'HIGH',
    ADD COLUMN last_report_sent_at TIMESTAMP;

-- Create email_reports table to track sent reports
CREATE TABLE email_reports (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    report_type VARCHAR(50) NOT NULL,
    sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'SENT',
    error_message TEXT,
    report_period_start DATE,
    report_period_end DATE
);

CREATE INDEX idx_email_reports_user_id ON email_reports(user_id);
CREATE INDEX idx_email_reports_sent_at ON email_reports(sent_at);

-- Create email_alert_notifications table to track alert notifications
CREATE TABLE email_alert_notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    alert_id BIGINT NOT NULL REFERENCES threat_alerts(id) ON DELETE CASCADE,
    sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'SENT',
    error_message TEXT,
    UNIQUE(user_id, alert_id)
);

CREATE INDEX idx_email_alert_notifications_user_id ON email_alert_notifications(user_id);
CREATE INDEX idx_email_alert_notifications_alert_id ON email_alert_notifications(alert_id);

COMMENT ON COLUMN users.report_frequency IS 'DAILY, WEEKLY, or NONE';
COMMENT ON COLUMN users.alert_severity_threshold IS 'CRITICAL, HIGH, MEDIUM, or LOW - minimum severity to receive alerts';
