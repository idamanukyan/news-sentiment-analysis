package com.newssentiment.controller;

import com.newssentiment.repository.ArticleRepository;
import com.newssentiment.repository.NarrativeRepository;
import com.newssentiment.repository.SourceRepository;
import com.newssentiment.repository.ThreatAlertRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.info.BuildProperties;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/system")
@RequiredArgsConstructor
public class SystemHealthController {

    private final ArticleRepository articleRepository;
    private final SourceRepository sourceRepository;
    private final NarrativeRepository narrativeRepository;
    private final ThreatAlertRepository alertRepository;
    private final Optional<BuildProperties> buildProperties;

    private final Instant startupTime = Instant.now();

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> getSystemHealth() {
        Map<String, Object> health = new HashMap<>();

        health.put("status", "UP");
        health.put("application", "AIIM - AI Information Integrity Monitor");
        health.put("timestamp", Instant.now().toString());
        health.put("uptime", getUptime());

        // Build info
        buildProperties.ifPresent(props -> {
            health.put("version", props.getVersion());
            health.put("buildTime", props.getTime() != null ? props.getTime().toString() : "N/A");
        });

        return ResponseEntity.ok(health);
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getSystemStatus() {
        Map<String, Object> status = new HashMap<>();

        Instant last24h = Instant.now().minus(24, ChronoUnit.HOURS);

        // Content statistics
        Map<String, Object> content = new HashMap<>();
        content.put("totalArticles", articleRepository.count());
        content.put("articlesLast24h", articleRepository.countByCreatedAtAfter(last24h));
        content.put("activeSources", sourceRepository.countByActiveTrue());
        content.put("totalSources", sourceRepository.count());
        status.put("content", content);

        // Monitoring status
        Map<String, Object> monitoring = new HashMap<>();
        monitoring.put("activeNarratives", narrativeRepository.countActiveNarratives());
        monitoring.put("activeAlerts", alertRepository.countByStatus(
            com.newssentiment.model.ThreatAlert.AlertStatus.ACTIVE));
        monitoring.put("criticalAlerts", alertRepository.countBySeverity(
            com.newssentiment.model.ThreatAlert.Severity.CRITICAL));
        status.put("monitoring", monitoring);

        // Data freshness
        Map<String, Object> freshness = new HashMap<>();
        articleRepository.findTopByOrderByCreatedAtDesc()
            .ifPresent(article -> freshness.put("lastArticleIngested", article.getCreatedAt().toString()));
        freshness.put("dataLag", calculateDataLag());
        status.put("freshness", freshness);

        status.put("healthy", isSystemHealthy());
        status.put("timestamp", Instant.now().toString());

        return ResponseEntity.ok(status);
    }

    @GetMapping("/metrics")
    public ResponseEntity<Map<String, Object>> getSystemMetrics() {
        Map<String, Object> metrics = new HashMap<>();

        // Content volume
        metrics.put("totalArticles", articleRepository.count());
        metrics.put("totalSources", sourceRepository.count());
        metrics.put("totalNarratives", narrativeRepository.count());
        metrics.put("totalAlerts", alertRepository.count());

        // Activity metrics
        Instant last24h = Instant.now().minus(24, ChronoUnit.HOURS);
        Instant last7d = Instant.now().minus(7, ChronoUnit.DAYS);

        metrics.put("articles24h", articleRepository.countByCreatedAtAfter(last24h));
        metrics.put("articles7d", articleRepository.countByCreatedAtAfter(last7d));
        metrics.put("alerts24h", alertRepository.countByTriggeredAtAfter(last24h));

        // Uptime
        metrics.put("uptimeSeconds", ChronoUnit.SECONDS.between(startupTime, Instant.now()));

        return ResponseEntity.ok(metrics);
    }

    private String getUptime() {
        long seconds = ChronoUnit.SECONDS.between(startupTime, Instant.now());
        long days = seconds / 86400;
        long hours = (seconds % 86400) / 3600;
        long minutes = (seconds % 3600) / 60;

        if (days > 0) {
            return String.format("%dd %dh %dm", days, hours, minutes);
        } else if (hours > 0) {
            return String.format("%dh %dm", hours, minutes);
        } else {
            return String.format("%dm", minutes);
        }
    }

    private String calculateDataLag() {
        return articleRepository.findTopByOrderByCreatedAtDesc()
            .map(article -> {
                long minutes = ChronoUnit.MINUTES.between(article.getCreatedAt(), Instant.now());
                if (minutes < 60) {
                    return minutes + " minutes";
                } else if (minutes < 1440) {
                    return (minutes / 60) + " hours";
                } else {
                    return (minutes / 1440) + " days";
                }
            })
            .orElse("No data");
    }

    private boolean isSystemHealthy() {
        // System is healthy if:
        // 1. We have active sources
        // 2. We've received data in the last hour
        // 3. Database is responsive (implicit - we got here)

        long activeSources = sourceRepository.countByActiveTrue();
        if (activeSources == 0) return false;

        Instant lastHour = Instant.now().minus(1, ChronoUnit.HOURS);
        long recentArticles = articleRepository.countByCreatedAtAfter(lastHour);

        // Allow for quiet periods - if no articles in last hour, check last 24h
        if (recentArticles == 0) {
            Instant last24h = Instant.now().minus(24, ChronoUnit.HOURS);
            return articleRepository.countByCreatedAtAfter(last24h) > 0;
        }

        return true;
    }
}
