package com.newssentiment.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "articles", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"source_id", "external_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Article {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_id")
    private Source source;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "topic_id")
    private Topic topic;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "narrative_id")
    private Narrative narrative;

    @Column(name = "external_id", length = 500)
    private String externalId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String title;

    @Column(columnDefinition = "TEXT")
    private String content;

    // English translations for cross-article matching and display
    @Column(name = "title_en", columnDefinition = "TEXT")
    private String titleEn;

    @Column(name = "content_en", columnDefinition = "TEXT")
    private String contentEn;

    @Column(name = "detected_language", length = 10)
    private String detectedLanguage;

    @Column(name = "translated_at")
    private Instant translatedAt;

    // LLM classification fields
    @Column(name = "llm_topic", length = 50)
    private String llmTopic;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "llm_keywords", columnDefinition = "TEXT[]")
    private String[] llmKeywords;

    @Column(name = "llm_subtopic", length = 255)
    private String llmSubtopic;

    @Column(name = "llm_classified_at")
    private Instant llmClassifiedAt;

    @Column(length = 500)
    private String url;

    @Column(length = 255)
    private String author;

    private Instant publishedAt;

    @Builder.Default
    @Column(nullable = false)
    private Instant fetchedAt = Instant.now();

    @Column(length = 64)
    private String contentHash;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> metadata;

    @Builder.Default
    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @OneToOne(mappedBy = "article", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private SentimentResult sentimentResult;

    /**
     * Get the display title - prefers English translation if available.
     */
    public String getDisplayTitle() {
        return titleEn != null && !titleEn.isEmpty() ? titleEn : title;
    }

    /**
     * Get the display content snippet - prefers English translation if available.
     */
    public String getDisplayContent() {
        return contentEn != null && !contentEn.isEmpty() ? contentEn : content;
    }
}
