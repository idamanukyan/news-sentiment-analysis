package com.newssentiment.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "fact_checks")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FactCheck {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "narrative_id")
    private Narrative narrative;

    @Column(name = "organization_id", nullable = false)
    private Long organizationId;

    @Column(nullable = false, length = 500)
    private String title;

    @Column(nullable = false, length = 1000)
    private String url;

    @Column(length = 200)
    @Builder.Default
    private String publisher = "CivilNet";

    @Enumerated(EnumType.STRING)
    @Column(length = 50)
    private Verdict verdict;

    @Column(name = "published_at")
    private Instant publishedAt;

    @Column(name = "added_at")
    @Builder.Default
    private Instant addedAt = Instant.now();

    @Column(name = "added_by", length = 100)
    private String addedBy;

    @Column(columnDefinition = "TEXT")
    private String notes;

    public enum Verdict {
        FALSE,
        MISLEADING,
        PARTLY_TRUE,
        TRUE,
        UNVERIFIED
    }
}
