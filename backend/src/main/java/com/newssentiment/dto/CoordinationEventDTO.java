package com.newssentiment.dto;

import java.time.Instant;
import java.util.List;

public record CoordinationEventDTO(
        Long id,
        Long narrativeId,
        String narrativeName,
        Instant detectedAt,
        Integer timeWindowHours,
        Integer sourceCount,
        Integer articleCount,
        Double similarityScore,
        String coordinationType,
        String description,
        List<String> sourcesInvolved,
        List<Long> articleIds,
        String status,
        Instant reviewedAt,
        String reviewedByName,
        Instant createdAt
) {}
