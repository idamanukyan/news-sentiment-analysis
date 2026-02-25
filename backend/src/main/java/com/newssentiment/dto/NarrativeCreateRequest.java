package com.newssentiment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record NarrativeCreateRequest(
        @NotBlank String name,
        String description,
        @NotEmpty List<String> keywords,
        String threatLevel
) {}
