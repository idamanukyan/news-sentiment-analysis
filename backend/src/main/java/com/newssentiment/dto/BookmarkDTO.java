package com.newssentiment.dto;

import java.time.Instant;

public record BookmarkDTO(
    Long id,
    Long articleId,
    Instant createdAt
) {}
