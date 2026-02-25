package com.newssentiment.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;

@Entity
@Table(name = "alert_rules")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AlertRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "organization_id", nullable = false)
    private Long organizationId;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Builder.Default
    @Column(nullable = false)
    private Boolean enabled = true;

    /**
     * Rule conditions stored as JSON. Possible keys:
     * - keywords: String[] - keywords to match in article title/content
     * - sentiment_threshold: Integer (0-100) - trigger when negative sentiment % exceeds this
     * - volume_threshold: Integer - trigger when article count exceeds this
     * - volume_timeframe_hours: Integer - timeframe for volume check (default 24)
     * - source_ids: Long[] - specific sources to monitor
     * - source_types: String[] - types of sources (NEWS, TELEGRAM, RSS)
     * - match_all: Boolean - if true, all conditions must match (AND); if false, any match triggers (OR)
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    @Builder.Default
    private Map<String, Object> conditions = Map.of();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ThreatAlert.Severity severity = ThreatAlert.Severity.MEDIUM;

    @Builder.Default
    @Column(name = "cooldown_minutes", nullable = false)
    private Integer cooldownMinutes = 60;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Builder.Default
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Builder.Default
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @Column(name = "last_triggered_at")
    private Instant lastTriggeredAt;

    @Builder.Default
    @Column(name = "trigger_count", nullable = false)
    private Integer triggerCount = 0;

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }

    /**
     * Check if the rule is ready to trigger (cooldown expired)
     */
    public boolean canTrigger() {
        if (!Boolean.TRUE.equals(enabled)) {
            return false;
        }
        if (lastTriggeredAt == null) {
            return true;
        }
        Instant cooldownExpiry = lastTriggeredAt.plusSeconds(cooldownMinutes * 60L);
        return Instant.now().isAfter(cooldownExpiry);
    }

    /**
     * Record that this rule was triggered
     */
    public void recordTrigger() {
        this.lastTriggeredAt = Instant.now();
        this.triggerCount = (this.triggerCount != null ? this.triggerCount : 0) + 1;
    }
}
