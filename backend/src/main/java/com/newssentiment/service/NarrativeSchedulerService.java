package com.newssentiment.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

/**
 * Scheduler for narrative tracking tasks.
 * Runs periodically to update counts and check for spikes.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NarrativeSchedulerService {

    private final NarrativeService narrativeService;
    private final ThreatAlertService threatAlertService;

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
}
