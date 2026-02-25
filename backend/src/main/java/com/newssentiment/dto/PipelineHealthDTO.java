package com.newssentiment.dto;

import java.time.Instant;
import java.util.List;

public record PipelineHealthDTO(
        String status,  // HEALTHY, DEGRADED, CRITICAL
        Instant timestamp,
        IngestionStats ingestion,
        TranslationStats translation,
        SentimentStats sentiment,
        List<SourceHealth> sources,
        List<TelegramHealth> telegramChannels,
        AlertStats alerts
) {
    public record IngestionStats(
            int articlesLast1h,
            int articlesLast24h,
            int articlesLast7d,
            double avgArticlesPerHour,
            Instant lastArticleAt
    ) {}

    public record TranslationStats(
            int totalArticles,
            int translatedArticles,
            double translationRate,
            int pendingTranslation,
            String status  // OK, BEHIND, STALLED
    ) {}

    public record SentimentStats(
            int totalArticles,
            int analyzedArticles,
            double analysisRate,
            int pendingAnalysis,
            String status  // OK, BEHIND, STALLED
    ) {}

    public record SourceHealth(
            Long id,
            String name,
            String type,
            boolean active,
            Instant lastFetched,
            Instant lastSuccess,
            int articlesLast24h,
            String status  // HEALTHY, STALE, FAILING
    ) {}

    public record TelegramHealth(
            Long id,
            String name,
            String username,
            boolean active,
            Instant lastFetched,
            int messagesLast24h,
            String status
    ) {}

    public record AlertStats(
            int activeAlerts,
            int highSeverityActive,
            int criticalSeverityActive,
            int alertsTriggeredLast24h
    ) {}
}
