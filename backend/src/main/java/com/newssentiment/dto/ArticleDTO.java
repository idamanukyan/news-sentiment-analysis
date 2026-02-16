package com.newssentiment.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record ArticleDTO(
        Long id,
        Long sourceId,
        String sourceName,
        String title,
        String url,
        String author,
        Instant publishedAt,
        String sentiment,
        BigDecimal confidence
) {}
