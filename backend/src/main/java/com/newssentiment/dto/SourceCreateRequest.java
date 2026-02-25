package com.newssentiment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.Map;

public record SourceCreateRequest(
        @NotBlank String name,
        @NotBlank String url,
        @NotNull String type,
        @NotNull String language,
        String politicalLeaning,
        Boolean active,
        Map<String, Object> config
) {}
