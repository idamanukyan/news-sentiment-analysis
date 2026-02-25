package com.newssentiment.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.List;

@Entity
@Table(name = "narratives")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Narrative {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "organization_id", nullable = false)
    private Long organizationId;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "keywords", columnDefinition = "TEXT[]")
    private String[] keywords;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private NarrativeStatus status = NarrativeStatus.ACTIVE;

    @Enumerated(EnumType.STRING)
    @Column(name = "threat_level", nullable = false, length = 20)
    @Builder.Default
    private ThreatLevel threatLevel = ThreatLevel.LOW;

    @Column(name = "first_seen")
    private Instant firstSeen;

    @Column(name = "last_seen")
    private Instant lastSeen;

    @Column(name = "article_count")
    @Builder.Default
    private Integer articleCount = 0;

    @Builder.Default
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    private Instant updatedAt;

    @OneToMany(mappedBy = "narrative", fetch = FetchType.LAZY)
    private List<ThreatAlert> alerts;

    public enum NarrativeStatus {
        ACTIVE, MONITORING, RESOLVED, ARCHIVED
    }

    public enum ThreatLevel {
        LOW, MEDIUM, HIGH, CRITICAL
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
