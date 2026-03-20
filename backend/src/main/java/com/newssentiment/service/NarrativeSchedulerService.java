package com.newssentiment.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

/**
 * Scheduler for narrative tracking tasks.
 * Runs periodically to update counts, check for spikes, and evaluate relevance.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NarrativeSchedulerService {

    private final NarrativeService narrativeService;
    private final ThreatAlertService threatAlertService;
    private final NarrativeRelevanceService narrativeRelevanceService;

    @Value("${app.anthropic.api-key:}")
    private String anthropicApiKey;

    /**
     * Update narrative article counts every 15 minutes.
     */
    @Scheduled(fixedDelayString = "${narrative.update.interval:900000}") // 15 minutes
    public void updateNarrativeCounts() {
        log.info("Scheduled: Updating narrative counts");
        try {
            narrativeService.updateNarrativeCounts();
        } catch (Exception e) {
            log.error("Error updating narrative counts", e);
        }
    }

    /**
     * Check for volume spikes every 30 minutes.
     */
    @Scheduled(fixedDelayString = "${narrative.spike.check.interval:1800000}") // 30 minutes
    public void checkForVolumeSpikes() {
        log.info("Scheduled: Checking for volume spikes");
        try {
            threatAlertService.checkForVolumeSpikes();
        } catch (Exception e) {
            log.error("Error checking for volume spikes", e);
        }
    }

    /**
     * Evaluate article-narrative relevance every 6 hours.
     * Uses Claude Haiku to filter out incorrectly clustered articles.
     */
    @Scheduled(fixedDelayString = "${narrative.relevance.interval:21600000}") // 6 hours
    public void evaluateNarrativeRelevance() {
        // Skip if Anthropic API key is not configured
        if (anthropicApiKey == null || anthropicApiKey.isBlank()) {
            log.debug("Skipping relevance evaluation: ANTHROPIC_API_KEY not configured");
            return;
        }

        log.info("Scheduled: Evaluating article-narrative relevance");
        try {
            long unscoredCount = narrativeRelevanceService.countUnscoredPairs();
            if (unscoredCount == 0) {
                log.info("No unscored article-narrative pairs to evaluate");
                return;
            }

            log.info("Found {} unscored article-narrative pairs", unscoredCount);
            int processed = narrativeRelevanceService.processAllUnscored();
            log.info("Completed relevance evaluation: processed {} pairs", processed);
        } catch (Exception e) {
            log.error("Error evaluating narrative relevance", e);
        }
    }
}
