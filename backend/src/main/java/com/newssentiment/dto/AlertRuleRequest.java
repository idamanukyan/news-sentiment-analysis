package com.newssentiment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record AlertRuleRequest(
    @NotBlank(message = "Name is required")
    @Size(max = 255, message = "Name must be less than 255 characters")
    String name,

    String description,

    @NotNull(message = "Conditions are required")
    AlertConditions conditions,

    String severity,

    Integer cooldownMinutes
) {
    public record AlertConditions(
        List<String> keywords,
        Integer sentimentThreshold,
        Integer volumeThreshold,
        Integer volumeTimeframeHours,
        List<Long> sourceIds,
        List<String> sourceTypes,
        Boolean matchAll
    ) {}
}
