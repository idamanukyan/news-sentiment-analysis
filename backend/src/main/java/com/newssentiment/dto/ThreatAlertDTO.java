package com.newssentiment.dto;

import java.time.Instant;
import java.util.Map;

public record ThreatAlertDTO(
        Long id,
        Long narrativeId,
        String narrativeName,
        String alertType,
        String severity,
        String title,
        String description,
        Instant triggeredAt,
        Instant acknowledgedAt,
        String acknowledgedByName,
        Instant resolvedAt,
        String resolvedByName,
        String status,
        Map<String, Object> metadata,
        Instant createdAt,
        // Assignment fields
        String assignedTo,
        Instant assignedAt,
        Integer priority,
        String notes,
        // Deduplication fields
        Integer occurrenceCount,
        Instant lastOccurredAt
) {}
