package com.newssentiment.dto;

import java.time.Instant;
import java.util.Map;

public record AlertRuleDTO(
    Long id,
    String name,
    String description,
    Boolean enabled,
    Map<String, Object> conditions,
    String severity,
    Integer cooldownMinutes,
    String createdByEmail,
    Instant createdAt,
    Instant updatedAt,
    Instant lastTriggeredAt,
    Integer triggerCount
) {}
