package com.newssentiment.service;

import com.newssentiment.dto.PipelineHealthDTO;
import com.newssentiment.dto.PipelineHealthDTO.*;
import com.newssentiment.model.Source;
import com.newssentiment.model.ThreatAlert;
import com.newssentiment.repository.ArticleRepository;
import com.newssentiment.repository.SourceRepository;
import com.newssentiment.repository.ThreatAlertRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class PipelineHealthService {

    private final ArticleRepository articleRepository;
    private final SourceRepository sourceRepository;
    private final ThreatAlertRepository threatAlertRepository;
    private final JdbcTemplate jdbcTemplate;

    private static final Duration STALE_THRESHOLD = Duration.ofHours(6);
    private static final Duration FAILING_THRESHOLD = Duration.ofHours(24);

    @Transactional(readOnly = true)
    public PipelineHealthDTO getHealth() {
        Instant now = Instant.now();

        IngestionStats ingestion = getIngestionStats(now);
        TranslationStats translation = getTranslationStats();
        SentimentStats sentiment = getSentimentStats();
        List<SourceHealth> sources = getSourceHealthList(now);
        List<TelegramHealth> telegramChannels = getTelegramHealthList(now);
        AlertStats alerts = getAlertStats(now);

        String overallStatus = determineOverallStatus(ingestion, translation, sentiment, sources, telegramChannels);

        return new PipelineHealthDTO(
            overallStatus,
            now,
            ingestion,
            translation,
            sentiment,
            sources,
            telegramChannels,
            alerts
        );
    }

    private IngestionStats getIngestionStats(Instant now) {
        Instant oneHourAgo = now.minus(Duration.ofHours(1));
        Instant oneDayAgo = now.minus(Duration.ofDays(1));
        Instant oneWeekAgo = now.minus(Duration.ofDays(7));

        int articlesLast1h = (int) articleRepository.countSince(oneHourAgo);
        int articlesLast24h = (int) articleRepository.countSince(oneDayAgo);
        int articlesLast7d = (int) articleRepository.countSince(oneWeekAgo);

        double avgArticlesPerHour = articlesLast7d > 0 ? articlesLast7d / 168.0 : 0.0;

        Instant lastArticleAt = articleRepository.findTopByOrderByCreatedAtDesc()
            .map(a -> a.getCreatedAt())
            .orElse(null);

        return new IngestionStats(
            articlesLast1h,
            articlesLast24h,
            articlesLast7d,
            Math.round(avgArticlesPerHour * 100.0) / 100.0,
            lastArticleAt
        );
    }

    private TranslationStats getTranslationStats() {
        Long totalArticles = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM articles", Long.class);
        Long translatedArticles = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM articles WHERE title_en IS NOT NULL", Long.class);

        int total = totalArticles != null ? totalArticles.intValue() : 0;
        int translated = translatedArticles != null ? translatedArticles.intValue() : 0;
        int pending = total - translated;
        double rate = total > 0 ? (translated * 100.0) / total : 0.0;

        String status;
        if (rate >= 95) {
            status = "OK";
        } else if (rate >= 80) {
            status = "BEHIND";
        } else {
            status = "STALLED";
        }

        return new TranslationStats(
            total,
            translated,
            Math.round(rate * 100.0) / 100.0,
            pending,
            status
        );
    }

    private SentimentStats getSentimentStats() {
        Long totalArticles = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM articles", Long.class);
        Long analyzedArticles = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM sentiment_results", Long.class);

        int total = totalArticles != null ? totalArticles.intValue() : 0;
        int analyzed = analyzedArticles != null ? analyzedArticles.intValue() : 0;
        int pending = total - analyzed;
        double rate = total > 0 ? (analyzed * 100.0) / total : 0.0;

        String status;
        if (rate >= 95) {
            status = "OK";
        } else if (rate >= 80) {
            status = "BEHIND";
        } else {
            status = "STALLED";
        }

        return new SentimentStats(
            total,
            analyzed,
            Math.round(rate * 100.0) / 100.0,
            pending,
            status
        );
    }

    private List<SourceHealth> getSourceHealthList(Instant now) {
        List<Source> sources = sourceRepository.findByActiveTrue();
        List<SourceHealth> healthList = new ArrayList<>();

        Instant oneDayAgo = now.minus(Duration.ofDays(1));

        for (Source source : sources) {
            if (source.getType() == Source.SourceType.TELEGRAM) {
                continue; // Telegram channels handled separately
            }

            int articlesLast24h = (int) articleRepository.countBySourceIdSince(source.getId(), oneDayAgo);
            String status = determineSourceStatus(source.getLastSuccess(), now);

            healthList.add(new SourceHealth(
                source.getId(),
                source.getName(),
                source.getType().name(),
                source.getActive(),
                source.getLastFetched(),
                source.getLastSuccess(),
                articlesLast24h,
                status
            ));
        }

        return healthList;
    }

    private List<TelegramHealth> getTelegramHealthList(Instant now) {
        List<Source> telegramSources = sourceRepository.findActiveByType(Source.SourceType.TELEGRAM);
        List<TelegramHealth> healthList = new ArrayList<>();

        Instant oneDayAgo = now.minus(Duration.ofDays(1));

        for (Source source : telegramSources) {
            int messagesLast24h = (int) articleRepository.countBySourceIdSince(source.getId(), oneDayAgo);
            String status = determineSourceStatus(source.getLastSuccess(), now);

            // Extract username from config if available
            String username = null;
            if (source.getConfig() != null && source.getConfig().containsKey("channel_username")) {
                username = source.getConfig().get("channel_username").toString();
            }

            healthList.add(new TelegramHealth(
                source.getId(),
                source.getName(),
                username,
                source.getActive(),
                source.getLastFetched(),
                messagesLast24h,
                status
            ));
        }

        return healthList;
    }

    private AlertStats getAlertStats(Instant now) {
        Instant oneDayAgo = now.minus(Duration.ofDays(1));

        int activeAlerts = (int) threatAlertRepository.countByStatus(ThreatAlert.AlertStatus.ACTIVE);
        int highSeverityActive = (int) threatAlertRepository.countActiveBySeverity(ThreatAlert.Severity.HIGH);
        int criticalSeverityActive = (int) threatAlertRepository.countActiveBySeverity(ThreatAlert.Severity.CRITICAL);
        int alertsTriggeredLast24h = (int) threatAlertRepository.countByTriggeredAtAfter(oneDayAgo);

        return new AlertStats(
            activeAlerts,
            highSeverityActive,
            criticalSeverityActive,
            alertsTriggeredLast24h
        );
    }

    private String determineSourceStatus(Instant lastSuccess, Instant now) {
        if (lastSuccess == null) {
            return "FAILING";
        }

        Duration sinceLastSuccess = Duration.between(lastSuccess, now);

        if (sinceLastSuccess.compareTo(FAILING_THRESHOLD) > 0) {
            return "FAILING";
        } else if (sinceLastSuccess.compareTo(STALE_THRESHOLD) > 0) {
            return "STALE";
        } else {
            return "HEALTHY";
        }
    }

    private String determineOverallStatus(
            IngestionStats ingestion,
            TranslationStats translation,
            SentimentStats sentiment,
            List<SourceHealth> sources,
            List<TelegramHealth> telegramChannels) {

        // Critical if no articles in 24h or more than 50% of sources failing
        if (ingestion.articlesLast24h() == 0) {
            return "CRITICAL";
        }

        long failingSources = sources.stream()
            .filter(s -> "FAILING".equals(s.status()))
            .count();

        long failingTelegram = telegramChannels.stream()
            .filter(t -> "FAILING".equals(t.status()))
            .count();

        int totalSources = sources.size() + telegramChannels.size();
        long totalFailing = failingSources + failingTelegram;

        if (totalSources > 0 && totalFailing > totalSources / 2) {
            return "CRITICAL";
        }

        // Degraded if translation or sentiment is stalled, or any source is failing
        if ("STALLED".equals(translation.status()) || "STALLED".equals(sentiment.status())) {
            return "DEGRADED";
        }

        if (totalFailing > 0 || "BEHIND".equals(translation.status()) || "BEHIND".equals(sentiment.status())) {
            return "DEGRADED";
        }

        return "HEALTHY";
    }
}
