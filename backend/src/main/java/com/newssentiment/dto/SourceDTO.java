package com.newssentiment.dto;

import java.time.Instant;

public record SourceDTO(
        Long id,
        String name,
        String url,
        String type,
        String language,
        Boolean active,
        Instant lastFetched,
        Instant lastSuccess
) {}
