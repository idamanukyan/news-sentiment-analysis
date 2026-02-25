package com.newssentiment.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;

/**
 * Separate service for cache eviction to avoid circular dependencies.
 * Inject this into services that need to invalidate dashboard cache.
 */
@Service
@Slf4j
public class DashboardCacheEvictionService {

    /**
     * Evict dashboard cache for a specific organization.
     * Call this when data changes (new articles, alerts, etc.)
     */
    @CacheEvict(value = "dashboard-stats", key = "#orgId")
    public void evictDashboardCache(Long orgId) {
        log.debug("Evicting dashboard cache for org: {}", orgId);
    }

    /**
     * Evict dashboard cache for all organizations.
     */
    @CacheEvict(value = "dashboard-stats", allEntries = true)
    public void evictAllDashboardCaches() {
        log.debug("Evicting all dashboard caches");
    }

    /**
     * Evict pipeline health cache.
     */
    @CacheEvict(value = "pipeline-health", allEntries = true)
    public void evictPipelineHealthCache() {
        log.debug("Evicting pipeline health cache");
    }
}
