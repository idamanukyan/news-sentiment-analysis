package com.newssentiment.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record ArticleDTO(
        Long id,
        Long sourceId,
        String sourceName,
        String sourceType,
        String language,
        Long topicId,
        String topicName,
        Long narrativeId,
        String narrativeName,
        String title,
        String titleEn,
        String snippet,
        String snippetEn,
        String detectedLanguage,
        String llmTopic,
        List<String> llmKeywords,
        String url,
        String author,
        Instant publishedAt,
        String sentiment,
        BigDecimal confidence
) {}
