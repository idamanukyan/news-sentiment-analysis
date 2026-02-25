package com.newssentiment.service;

import com.newssentiment.model.Source;
import com.newssentiment.repository.ArticleRepository;
import com.newssentiment.repository.SourceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Service for calculating and updating source credibility scores.
 * Runs daily to update scores based on various factors.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CredibilityService {

    private final SourceRepository sourceRepository;
    private final ArticleRepository articleRepository;

    // Weights for different credibility factors
    private static final double WEIGHT_FACT_CHECK = 0.40;
    private static final double WEIGHT_VOLUME_CONSISTENCY = 0.25;
    private static final double WEIGHT_ACTIVITY = 0.20;
    private static final double WEIGHT_LONGEVITY = 0.15;

    /**
     * Update credibility scores for all active sources.
     * Runs daily at 3 AM.
     */
    @Scheduled(cron = "0 0 3 * * ?")
    @Transactional
    public void updateAllCredibilityScores() {
        log.info("Starting credibility score update for all sources...");

        List<Source> activeSources = sourceRepository.findByActiveTrue();
        int updated = 0;

        for (Source source : activeSources) {
            try {
                updateCredibilityScore(source);
                updated++;
            } catch (Exception e) {
                log.error("Failed to update credibility for source {}: {}", source.getId(), e.getMessage());
            }
        }

        log.info("Updated credibility scores for {} sources", updated);
    }

    /**
     * Update credibility score for a single source.
     */
    @Transactional
    public void updateCredibilityScore(Source source) {
        Map<String, Object> factors = new HashMap<>();

        // Factor 1: Fact-check alignment (40%)
        double factCheckScore = calculateFactCheckScore(source, factors);

        // Factor 2: Volume consistency (25%)
        double volumeConsistencyScore = calculateVolumeConsistencyScore(source, factors);

        // Factor 3: Activity/freshness (20%)
        double activityScore = calculateActivityScore(source, factors);

        // Factor 4: Longevity/track record (15%)
        double longevityScore = calculateLongevityScore(source, factors);

        // Calculate weighted score
        double credibilityScore =
                (factCheckScore * WEIGHT_FACT_CHECK) +
                (volumeConsistencyScore * WEIGHT_VOLUME_CONSISTENCY) +
                (activityScore * WEIGHT_ACTIVITY) +
                (longevityScore * WEIGHT_LONGEVITY);

        // Clamp to 0.0 - 1.0 range
        credibilityScore = Math.max(0.0, Math.min(1.0, credibilityScore));

        // Update source
        source.setCredibilityScore(Math.round(credibilityScore * 100.0) / 100.0);
        source.setCredibilityFactors(factors);
        source.setCredibilityUpdatedAt(Instant.now());

        sourceRepository.save(source);

        log.debug("Updated credibility for source '{}': {}", source.getName(), source.getCredibilityScore());
    }

    /**
     * Calculate fact-check alignment score.
     * Since fact-checks are linked to narratives (not sources directly),
     * we use source type and political leaning as proxies.
     * Official news agencies get higher base scores.
     */
    private double calculateFactCheckScore(Source source, Map<String, Object> factors) {
        try {
            double score = 0.5; // Base neutral score

            // Boost for mainstream/official sources
            if (source.getType() == Source.SourceType.RSS) {
                score += 0.1; // RSS feeds tend to be more established
            }

            // Political leaning adjustments
            if (source.getPoliticalLeaning() != null) {
                switch (source.getPoliticalLeaning()) {
                    case INDEPENDENT -> score += 0.15;
                    case GOVERNMENT -> score += 0.05; // Official but may have bias
                    case OPPOSITION -> score += 0.0;  // Neutral
                    case DIASPORA -> score += 0.05;
                }
            }

            // Check source name patterns for known reliable sources
            String nameLower = source.getName().toLowerCase();
            if (nameLower.contains("azatutyun") || nameLower.contains("rfe/rl")) {
                score += 0.2; // Radio Free Europe is generally reliable
            } else if (nameLower.contains("hetq") || nameLower.contains("civilnet")) {
                score += 0.15; // Known investigative outlets
            } else if (nameLower.contains("sputnik")) {
                score -= 0.1; // Known state media with bias concerns
            }

            // Clamp to valid range
            score = Math.max(0.2, Math.min(1.0, score));

            factors.put("factCheckScore", Math.round(score * 100.0) / 100.0);
            factors.put("sourceType", source.getType().name());
            factors.put("politicalLeaning", source.getPoliticalLeaning() != null ?
                    source.getPoliticalLeaning().name() : "UNKNOWN");

            return score;
        } catch (Exception e) {
            log.warn("Error calculating fact-check score for source {}: {}", source.getId(), e.getMessage());
            factors.put("factCheckScore", 0.5);
            return 0.5;
        }
    }

    /**
     * Calculate volume consistency score.
     * Higher score if source publishes consistently.
     */
    private double calculateVolumeConsistencyScore(Source source, Map<String, Object> factors) {
        try {
            Instant thirtyDaysAgo = Instant.now().minus(30, ChronoUnit.DAYS);

            // Get daily article counts for last 30 days
            long totalArticles = articleRepository.countBySourceIdSince(source.getId(), thirtyDaysAgo);

            if (totalArticles == 0) {
                factors.put("volumeConsistency", 0.3);
                factors.put("volumeReason", "No articles in last 30 days");
                return 0.3; // Low score for inactive source
            }

            double avgPerDay = totalArticles / 30.0;

            // Score based on reasonable publishing rate (1-20 articles/day is good)
            double score;
            if (avgPerDay >= 1 && avgPerDay <= 20) {
                score = 0.9; // Optimal range
            } else if (avgPerDay > 20 && avgPerDay <= 50) {
                score = 0.7; // High volume but acceptable
            } else if (avgPerDay > 0.1) {
                score = 0.5; // Low but present
            } else {
                score = 0.3; // Very low activity
            }

            factors.put("volumeConsistency", Math.round(score * 100.0) / 100.0);
            factors.put("avgArticlesPerDay", Math.round(avgPerDay * 100.0) / 100.0);
            factors.put("totalLast30Days", totalArticles);

            return score;
        } catch (Exception e) {
            log.warn("Error calculating volume consistency for source {}: {}", source.getId(), e.getMessage());
            factors.put("volumeConsistency", 0.5);
            return 0.5;
        }
    }

    /**
     * Calculate activity/freshness score.
     * Higher score if source was recently active.
     */
    private double calculateActivityScore(Source source, Map<String, Object> factors) {
        Instant lastSuccess = source.getLastSuccess();

        if (lastSuccess == null) {
            factors.put("activityScore", 0.2);
            factors.put("activityReason", "Never successfully fetched");
            return 0.2;
        }

        long hoursSinceActive = ChronoUnit.HOURS.between(lastSuccess, Instant.now());

        double score;
        if (hoursSinceActive < 6) {
            score = 1.0;
        } else if (hoursSinceActive < 24) {
            score = 0.8;
        } else if (hoursSinceActive < 72) {
            score = 0.6;
        } else if (hoursSinceActive < 168) { // 1 week
            score = 0.4;
        } else {
            score = 0.2;
        }

        factors.put("activityScore", score);
        factors.put("hoursSinceLastFetch", hoursSinceActive);

        return score;
    }

    /**
     * Calculate longevity/track record score.
     * Higher score for established sources with longer history.
     */
    private double calculateLongevityScore(Source source, Map<String, Object> factors) {
        Instant createdAt = source.getCreatedAt();

        if (createdAt == null) {
            factors.put("longevityScore", 0.5);
            return 0.5;
        }

        long daysActive = ChronoUnit.DAYS.between(createdAt, Instant.now());

        double score;
        if (daysActive > 365) {
            score = 1.0; // More than a year
        } else if (daysActive > 180) {
            score = 0.8; // 6 months+
        } else if (daysActive > 90) {
            score = 0.6; // 3 months+
        } else if (daysActive > 30) {
            score = 0.4; // 1 month+
        } else {
            score = 0.3; // New source
        }

        factors.put("longevityScore", score);
        factors.put("daysActive", daysActive);

        return score;
    }

    /**
     * Get credibility rating label based on score.
     */
    public String getCredibilityLabel(double score) {
        if (score >= 0.8) return "HIGH";
        if (score >= 0.6) return "MEDIUM";
        if (score >= 0.4) return "LOW";
        return "VERY_LOW";
    }
}
