package com.newssentiment.model;

import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "article_narratives")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@IdClass(ArticleNarrative.ArticleNarrativeId.class)
public class ArticleNarrative {

    @Id
    @Column(name = "article_id")
    private Long articleId;

    @Id
    @Column(name = "narrative_id")
    private Long narrativeId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "article_id", insertable = false, updatable = false)
    private Article article;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "narrative_id", insertable = false, updatable = false)
    private Narrative narrative;

    @Column(precision = 3, scale = 2)
    @Builder.Default
    private BigDecimal confidence = BigDecimal.ONE;

    @Column(name = "relevance_score")
    private Float relevanceScore;

    @Builder.Default
    @Column(name = "detected_at")
    private Instant detectedAt = Instant.now();

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ArticleNarrativeId implements Serializable {
        private Long articleId;
        private Long narrativeId;
    }
}
