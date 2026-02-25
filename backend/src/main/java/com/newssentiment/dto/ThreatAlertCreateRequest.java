package com.newssentiment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.Map;

public record ThreatAlertCreateRequest(
        Long narrativeId,

        @NotNull(message = "Alert type is required")
        String alertType,

        @NotNull(message = "Severity is required")
        String severity,

        @NotBlank(message = "Title is required")
        @Size(max = 500, message = "Title must be less than 500 characters")
        String title,

        String description,

        Map<String, Object> metadata
) {}
