package com.newssentiment.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.List;

@Entity
@Table(name = "coordination_events")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CoordinationEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "organization_id", nullable = false)
    private Long organizationId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "narrative_id")
    private Narrative narrative;

    @Column(name = "detected_at", nullable = false)
    @Builder.Default
    private Instant detectedAt = Instant.now();

    @Column(name = "time_window_hours", nullable = false)
    private Integer timeWindowHours;

    @Column(name = "source_count", nullable = false)
    private Integer sourceCount;

    @Column(name = "article_count", nullable = false)
    private Integer articleCount;

    @Column(name = "similarity_score")
    private Double similarityScore;

    @Enumerated(EnumType.STRING)
    @Column(name = "coordination_type", nullable = false, length = 50)
    private CoordinationType coordinationType;

    @Column(columnDefinition = "TEXT")
    private String description;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "sources_involved", columnDefinition = "jsonb")
    private List<String> sourcesInvolved;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "article_ids", columnDefinition = "jsonb")
    private List<Long> articleIds;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private EventStatus status = EventStatus.ACTIVE;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by")
    private User reviewedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    public enum CoordinationType {
        TIMING,
        CONTENT,
        TIMING_AND_CONTENT
    }

    public enum EventStatus {
        ACTIVE,
        REVIEWED,
        DISMISSED
    }
}
