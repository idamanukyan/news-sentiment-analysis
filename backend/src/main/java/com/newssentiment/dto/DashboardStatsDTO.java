package com.newssentiment.dto;

import java.util.List;
import java.util.Map;

public record DashboardStatsDTO(
        long totalArticles,
        long articlesToday,
        long telegramPosts,
        long activeNarratives,
        long activeAlerts,
        long activeCoordinationEvents,
        long totalSources,
        String overallThreatLevel,
        List<NarrativeDTO> topNarratives,
        List<ThreatAlertDTO> recentAlerts,
        Map<String, Long> articlesBySource,
        Map<String, Long> sentimentDistribution,
        List<VolumeDataPoint> volumeTimeline
) {
    public record VolumeDataPoint(String date, long count) {}
}
