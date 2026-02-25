package com.newssentiment.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.Instant;

public record FactCheckCreateRequest(
        @NotBlank(message = "Title is required")
        String title,

        @NotBlank(message = "URL is required")
        String url,

        String publisher,

        String verdict,

        Instant publishedAt,

        String notes
) {}
