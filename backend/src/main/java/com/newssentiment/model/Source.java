package com.newssentiment.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;

@Entity
@Table(name = "sources")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Source {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "organization_id", nullable = false)
    private Long organizationId;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, length = 500)
    private String url;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private SourceType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Language language;

    @Enumerated(EnumType.STRING)
    @Column(name = "political_leaning", length = 30)
    @Builder.Default
    private PoliticalLeaning politicalLeaning = PoliticalLeaning.INDEPENDENT;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> config;

    @Builder.Default
    @Column(nullable = false)
    private Boolean active = true;

    private Instant lastFetched;

    private Instant lastSuccess;

    // Credibility scoring fields
    @Column(name = "credibility_score")
    @Builder.Default
    private Double credibilityScore = 0.5;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "credibility_factors", columnDefinition = "jsonb")
    private Map<String, Object> credibilityFactors;

    @Column(name = "credibility_updated_at")
    private Instant credibilityUpdatedAt;

    @Builder.Default
    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Builder.Default
    @Column(nullable = false)
    private Instant updatedAt = Instant.now();

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }

    public enum SourceType {
        RSS,
        WEB_SCRAPE,
        TELEGRAM,
        FACEBOOK
    }

    public enum Language {
        ARMENIAN,
        RUSSIAN,
        ENGLISH
    }

    public enum PoliticalLeaning {
        GOVERNMENT,
        OPPOSITION,
        INDEPENDENT,
        DIASPORA
    }
}
