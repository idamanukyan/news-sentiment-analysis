package com.newssentiment.dto;

import java.time.Instant;
import java.util.Map;

public record SourceDTO(
        Long id,
        String name,
        String url,
        String type,
        String language,
        String politicalLeaning,
        Boolean active,
        Instant lastFetched,
        Instant lastSuccess,
        Map<String, Object> config,
        Long articleCount,
        Double credibilityScore,
        Map<String, Object> credibilityFactors,
        Instant credibilityUpdatedAt,
        Instant createdAt
) {
    // Backwards compatible constructor
    public SourceDTO(Long id, String name, String url, String type, String language,
                     Boolean active, Instant lastFetched, Instant lastSuccess) {
        this(id, name, url, type, language, null, active, lastFetched, lastSuccess, null, 0L, null, null, null, null);
    }
}
