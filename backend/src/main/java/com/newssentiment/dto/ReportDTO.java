package com.newssentiment.dto;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public record ReportDTO(
        String title,
        String type,
        Instant generatedAt,
        Instant periodStart,
        Instant periodEnd,
        ReportSummary summary,
        List<NarrativeDTO> narratives,
        List<ThreatAlertDTO> alerts,
        Map<String, Object> metadata
) {
    public record ReportSummary(
            long totalArticles,
            long totalNarratives,
            long totalAlerts,
            long highThreatNarratives,
            String overallThreatLevel,
            Map<String, Long> sentimentDistribution,
            Map<String, Long> sourceDistribution
    ) {}
}
