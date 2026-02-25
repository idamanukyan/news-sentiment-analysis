package com.newssentiment.service;

import com.newssentiment.dto.DashboardStatsDTO;
import com.newssentiment.dto.DashboardStatsDTO.VolumeDataPoint;
import com.newssentiment.dto.NarrativeDTO;
import com.newssentiment.dto.ThreatAlertDTO;
import com.newssentiment.model.Narrative.ThreatLevel;
import com.newssentiment.model.Source;
import com.newssentiment.repository.ArticleRepository;
import com.newssentiment.repository.SourceRepository;
import com.newssentiment.security.OrganizationContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Date;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class DashboardService {

    private final ArticleRepository articleRepository;
    private final SourceRepository sourceRepository;
    private final NarrativeService narrativeService;
    private final ThreatAlertService alertService;
    private final CoordinationEventService coordinationEventService;
    private final SentimentService sentimentService;

    private Long getOrgId() {
        return OrganizationContext.getCurrentOrganizationIdOrNull();
    }

    /**
     * Get dashboard stats with caching. Delegates to cached method with explicit orgId.
     */
    @Transactional(readOnly = true)
    public DashboardStatsDTO getStats() {
        Long orgId = getOrgId();
        return getStatsForOrg(orgId != null ? orgId : 0L);
    }

    /**
     * Cached dashboard stats by organization ID.
     * Cache key is the orgId (0 for null/system-wide).
     */
    @Cacheable(value = "dashboard-stats", key = "#orgId")
    @Transactional(readOnly = true)
    public DashboardStatsDTO getStatsForOrg(Long orgId) {
        // Use passed orgId instead of context for caching to work properly
        Long effectiveOrgId = orgId == 0L ? null : orgId;
        Instant todayStart = Instant.now().truncatedTo(ChronoUnit.DAYS);

        // Get counts (org-scoped)
        long totalArticles = effectiveOrgId != null ? articleRepository.countByOrganizationId(effectiveOrgId) : articleRepository.count();
        long articlesToday = effectiveOrgId != null
                ? articleRepository.countByOrganizationIdAndPublishedAtBetween(effectiveOrgId, todayStart, Instant.now())
                : articleRepository.findByPublishedAtBetween(
                        todayStart, Instant.now(),
                        org.springframework.data.domain.PageRequest.of(0, 1)
                ).getTotalElements();
        long telegramPosts = effectiveOrgId != null ? articleRepository.countTelegramPostsByOrganizationId(effectiveOrgId) : articleRepository.countTelegramPosts();
        long activeNarratives = narrativeService.countActive();
        long activeAlerts = alertService.countActive();
        long activeCoordinationEvents = coordinationEventService.countActive();
        long totalSources = effectiveOrgId != null ? sourceRepository.countByOrganizationId(effectiveOrgId) : sourceRepository.count();

        // Get overall threat level
        ThreatLevel threatLevel = narrativeService.getOverallThreatLevel();

        // Get top narratives
        List<NarrativeDTO> topNarratives = narrativeService.findTopByArticleCount(5);

        // Get recent alerts (last 24 hours)
        List<ThreatAlertDTO> recentAlerts = alertService.findRecent(24);

        // Get sentiment distribution
        Map<String, Long> sentimentDistribution = getSentimentDistribution();

        // Get articles by source type (real data)
        Map<String, Long> articlesBySource = getArticlesBySourceType(effectiveOrgId);

        // Get volume timeline (last 7 days)
        List<VolumeDataPoint> volumeTimeline = getVolumeTimeline(effectiveOrgId, 7);

        return new DashboardStatsDTO(
                totalArticles,
                articlesToday,
                telegramPosts,
                activeNarratives,
                activeAlerts,
                activeCoordinationEvents,
                totalSources,
                threatLevel.name(),
                topNarratives,
                recentAlerts,
                articlesBySource,
                sentimentDistribution,
                volumeTimeline
        );
    }

    private Map<String, Long> getArticlesBySourceType(Long orgId) {
        Map<String, Long> result = new LinkedHashMap<>();
        // Initialize with zeros
        result.put("RSS", 0L);
        result.put("WEB_SCRAPE", 0L);
        result.put("TELEGRAM", 0L);

        try {
            List<Object[]> counts = orgId != null
                    ? articleRepository.countBySourceTypeAndOrganizationId(orgId)
                    : articleRepository.countBySourceType();
            for (Object[] row : counts) {
                Source.SourceType type = (Source.SourceType) row[0];
                Long count = (Long) row[1];
                result.put(type.name(), count);
            }
        } catch (Exception e) {
            log.warn("Could not get articles by source type: {}", e.getMessage());
        }
        return result;
    }

    private List<VolumeDataPoint> getVolumeTimeline(Long orgId, int days) {
        List<VolumeDataPoint> timeline = new ArrayList<>();
        try {
            Instant since = Instant.now().minus(days, ChronoUnit.DAYS).truncatedTo(ChronoUnit.DAYS);
            List<Object[]> dailyCounts = orgId != null
                    ? articleRepository.countByDaySinceAndOrganizationId(orgId, since)
                    : articleRepository.countByDaySince(since);
            for (Object[] row : dailyCounts) {
                String date = row[0].toString();
                long count = ((Number) row[1]).longValue();
                timeline.add(new VolumeDataPoint(date, count));
            }
        } catch (Exception e) {
            log.warn("Could not get volume timeline: {}", e.getMessage());
        }
        return timeline;
    }

    private Map<String, Long> getSentimentDistribution() {
        try {
            return sentimentService.getOverallCounts(null, null);
        } catch (Exception e) {
            log.warn("Could not get sentiment distribution: {}", e.getMessage());
            Map<String, Long> distribution = new LinkedHashMap<>();
            distribution.put("POSITIVE", 0L);
            distribution.put("NEUTRAL", 0L);
            distribution.put("NEGATIVE", 0L);
            return distribution;
        }
    }

}
