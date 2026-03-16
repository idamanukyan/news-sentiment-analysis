package com.newssentiment.dto;

import java.time.Instant;
import java.util.List;

public record NarrativeDTO(
        Long id,
        String name,
        String description,
        List<String> keywords,
        String status,
        String threatLevel,
        Instant firstSeen,
        Instant lastSeen,
        Integer articleCount,
        Integer alertCount,
        Boolean hasCoordinationEvents,
        Integer coordinationEventCount,
        Integer factCheckCount,
        Boolean hasFactChecks,
        Instant createdAt,
        AiSummaryDTO aiSummary
) {}
