package com.newssentiment.service;

import com.newssentiment.dto.ThreatAlertDTO;
import com.newssentiment.model.Narrative;
import com.newssentiment.model.ThreatAlert;
import com.newssentiment.model.ThreatAlert.AlertStatus;
import com.newssentiment.model.ThreatAlert.AlertType;
import com.newssentiment.model.ThreatAlert.Severity;
import com.newssentiment.model.User;
import com.newssentiment.repository.NarrativeRepository;
import com.newssentiment.repository.ThreatAlertRepository;
import com.newssentiment.repository.UserRepository;
import com.newssentiment.security.OrganizationContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.newssentiment.repository.ArticleRepository;
import org.springframework.scheduling.annotation.Scheduled;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ThreatAlertService {

    private final ThreatAlertRepository alertRepository;
    private final NarrativeRepository narrativeRepository;
    private final UserRepository userRepository;
    private final ArticleRepository articleRepository;
    private final DashboardCacheEvictionService cacheEvictionService;
    private final WebSocketNotificationService webSocketService;

    private Long getOrgId() {
        return OrganizationContext.getCurrentOrganizationIdOrNull();
    }

    @Transactional(readOnly = true)
    public Page<ThreatAlertDTO> findAll(Pageable pageable) {
        Long orgId = getOrgId();
        if (orgId != null) {
            return alertRepository.findByOrganizationIdWithFilters(orgId, null, null, null, null, pageable).map(this::toDTO);
        }
        return alertRepository.findAll(pageable).map(this::toDTO);
    }

    @Transactional(readOnly = true)
    public Page<ThreatAlertDTO> findWithFilters(
            AlertStatus status,
            Severity severity,
            AlertType alertType,
            Long narrativeId,
            Pageable pageable) {
        Long orgId = getOrgId();
        if (orgId != null) {
            return alertRepository.findByOrganizationIdWithFilters(orgId, status, severity, alertType, narrativeId, pageable)
                    .map(this::toDTO);
        }
        return alertRepository.findWithFilters(status, severity, alertType, narrativeId, pageable)
                .map(this::toDTO);
    }

    @Transactional(readOnly = true)
    public Optional<ThreatAlertDTO> findById(Long id) {
        Long orgId = getOrgId();
        if (orgId != null) {
            return alertRepository.findByIdAndOrganizationId(id, orgId).map(this::toDTO);
        }
        return alertRepository.findById(id).map(this::toDTO);
    }

    @Transactional(readOnly = true)
    public List<ThreatAlertDTO> findActive() {
        Long orgId = getOrgId();
        if (orgId != null) {
            return alertRepository.findByOrganizationIdAndStatus(orgId, AlertStatus.ACTIVE)
                    .stream()
                    .map(this::toDTO)
                    .toList();
        }
        return alertRepository.findByStatus(AlertStatus.ACTIVE)
                .stream()
                .map(this::toDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ThreatAlertDTO> findUrgent() {
        Long orgId = getOrgId();
        if (orgId != null) {
            return alertRepository.findByOrganizationIdAndUrgent(orgId)
                    .stream()
                    .map(this::toDTO)
                    .toList();
        }
        return alertRepository.findUrgentAlerts()
                .stream()
                .map(this::toDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ThreatAlertDTO> findRecent(int hours) {
        Instant since = Instant.now().minus(hours, ChronoUnit.HOURS);
        Long orgId = getOrgId();
        if (orgId != null) {
            return alertRepository.findByOrganizationIdAndTriggeredSince(orgId, since)
                    .stream()
                    .map(this::toDTO)
                    .toList();
        }
        return alertRepository.findTriggeredSince(since)
                .stream()
                .map(this::toDTO)
                .toList();
    }

    @Transactional
    public ThreatAlertDTO createAlert(
            Long narrativeId,
            AlertType type,
            Severity severity,
            String title,
            String description,
            Map<String, Object> metadata) {

        Long orgId = getOrgId();
        Narrative narrative = narrativeId != null
                ? (orgId != null
                        ? narrativeRepository.findByIdAndOrganizationId(narrativeId, orgId).orElse(null)
                        : narrativeRepository.findById(narrativeId).orElse(null))
                : null;

        // Use narrative's org or current context
        Long alertOrgId = narrative != null ? narrative.getOrganizationId() : orgId;
        if (alertOrgId == null) {
            log.error("Cannot create alert '{}': no organization context and no narrative provided. " +
                    "Alerts must be associated with an organization.", title);
            throw new IllegalStateException("Organization context is required to create alerts. " +
                    "Either provide a narrative with an organizationId or ensure OrganizationContext is set.");
        }

        ThreatAlert alert = ThreatAlert.builder()
                .organizationId(alertOrgId)
                .narrative(narrative)
                .alertType(type)
                .severity(severity)
                .title(title)
                .description(description)
                .metadata(metadata != null ? metadata : Map.of())
                .status(AlertStatus.ACTIVE)
                .triggeredAt(Instant.now())
                .build();

        log.info("Created {} severity alert: {}", severity, title);
        ThreatAlert saved = alertRepository.save(alert);
        cacheEvictionService.evictDashboardCache(alertOrgId != 0L ? alertOrgId : 0L);

        // Send WebSocket notification
        ThreatAlertDTO dto = toDTO(saved);
        webSocketService.notifyNewAlert(alertOrgId, dto);

        return dto;
    }

    @Transactional
    public Optional<ThreatAlertDTO> acknowledge(Long alertId, Long userId) {
        return alertRepository.findById(alertId)
                .map(alert -> {
                    alert.setStatus(AlertStatus.ACKNOWLEDGED);
                    alert.setAcknowledgedAt(Instant.now());
                    if (userId != null) {
                        userRepository.findById(userId).ifPresent(alert::setAcknowledgedBy);
                    }
                    log.info("Alert {} acknowledged by user {}", alertId, userId);
                    ThreatAlert saved = alertRepository.save(alert);
                    Long orgId = alert.getOrganizationId() != null ? alert.getOrganizationId() : 0L;
                    cacheEvictionService.evictDashboardCache(orgId);

                    ThreatAlertDTO dto = toDTO(saved);
                    webSocketService.notifyAlertStatusChange(orgId, dto);
                    return dto;
                });
    }

    @Transactional
    public Optional<ThreatAlertDTO> resolve(Long alertId, Long userId) {
        return alertRepository.findById(alertId)
                .map(alert -> {
                    alert.setStatus(AlertStatus.RESOLVED);
                    alert.setResolvedAt(Instant.now());
                    if (userId != null) {
                        userRepository.findById(userId).ifPresent(alert::setResolvedBy);
                    }
                    log.info("Alert {} resolved by user {}", alertId, userId);
                    ThreatAlert saved = alertRepository.save(alert);
                    Long orgId = alert.getOrganizationId() != null ? alert.getOrganizationId() : 0L;
                    cacheEvictionService.evictDashboardCache(orgId);

                    ThreatAlertDTO dto = toDTO(saved);
                    webSocketService.notifyAlertStatusChange(orgId, dto);
                    return dto;
                });
    }

    @Transactional
    public Optional<ThreatAlertDTO> dismiss(Long alertId) {
        return alertRepository.findById(alertId)
                .map(alert -> {
                    alert.setStatus(AlertStatus.DISMISSED);
                    ThreatAlert saved = alertRepository.save(alert);
                    Long orgId = alert.getOrganizationId() != null ? alert.getOrganizationId() : 0L;
                    cacheEvictionService.evictDashboardCache(orgId);

                    ThreatAlertDTO dto = toDTO(saved);
                    webSocketService.notifyAlertStatusChange(orgId, dto);
                    return dto;
                });
    }

    @Transactional(readOnly = true)
    public long countActive() {
        Long orgId = getOrgId();
        if (orgId != null) {
            return alertRepository.countByOrganizationIdAndStatus(orgId, AlertStatus.ACTIVE);
        }
        return alertRepository.countByStatus(AlertStatus.ACTIVE);
    }

    @Transactional(readOnly = true)
    public long countBySeverity(Severity severity) {
        Long orgId = getOrgId();
        if (orgId != null) {
            return alertRepository.countByOrganizationIdAndActiveBySeverity(orgId, severity);
        }
        return alertRepository.countActiveBySeverity(severity);
    }

    /**
     * Check for volume spikes and create alerts if detected.
     * Called periodically by scheduler.
     *
     * Logic: Compare last 24h article count to average daily count over past 7 days.
     * If current > 2x average, flag as spike and create alert.
     */
    @Transactional
    public void checkForVolumeSpikes() {
        log.info("Checking for narrative volume spikes...");

        Instant now = Instant.now();
        Instant last24h = now.minus(24, ChronoUnit.HOURS);
        Instant last7Days = now.minus(7, ChronoUnit.DAYS);

        List<Narrative> activeNarratives = narrativeRepository.findByStatus(
                Narrative.NarrativeStatus.ACTIVE);

        int spikesDetected = 0;

        for (Narrative narrative : activeNarratives) {
            String[] keywords = narrative.getKeywords();
            if (keywords == null || keywords.length == 0) {
                continue;
            }

            // Count articles in last 24 hours
            long last24hCount = articleRepository.countByKeywordsSince(keywords, last24h);

            // Count articles in last 7 days for average
            long last7DaysCount = articleRepository.countByKeywordsSince(keywords, last7Days);

            // Calculate average daily count (excluding today)
            double avgDailyCount = (last7DaysCount - last24hCount) / 6.0;

            // Check for spike: current > 2x average (with minimum threshold of 5 articles)
            if (last24hCount >= 5 && avgDailyCount > 0 && last24hCount > (avgDailyCount * 2)) {
                double spikeRatio = last24hCount / avgDailyCount;

                // Check if we already have an active alert for this narrative
                boolean hasActiveAlert = alertRepository.findByStatus(AlertStatus.ACTIVE)
                        .stream()
                        .anyMatch(a -> a.getNarrative() != null
                                && a.getNarrative().getId().equals(narrative.getId())
                                && a.getAlertType() == AlertType.VOLUME_SPIKE);

                if (!hasActiveAlert) {
                    // Determine severity based on spike ratio
                    Severity severity = spikeRatio >= 5 ? Severity.HIGH :
                                       spikeRatio >= 3 ? Severity.MEDIUM : Severity.LOW;

                    createAlert(
                            narrative.getId(),
                            AlertType.VOLUME_SPIKE,
                            severity,
                            "Volume spike detected: " + narrative.getName(),
                            String.format("Narrative '%s' has %d articles in the last 24 hours, " +
                                    "which is %.1fx the average daily rate (%.1f articles/day).",
                                    narrative.getName(), last24hCount, spikeRatio, avgDailyCount),
                            Map.of(
                                    "last24hCount", last24hCount,
                                    "avgDailyCount", avgDailyCount,
                                    "spikeRatio", spikeRatio,
                                    "keywords", keywords
                            )
                    );

                    spikesDetected++;
                    log.warn("Volume spike detected for narrative '{}': {} articles ({}x average)",
                            narrative.getName(), last24hCount, String.format("%.1f", spikeRatio));
                }
            }
        }

        log.info("Volume spike check complete. {} spikes detected.", spikesDetected);
    }

    @Transactional
    public Optional<ThreatAlertDTO> assignAlert(Long alertId, String assignedTo, Integer priority) {
        Long orgId = getOrgId();
        return (orgId != null
                ? alertRepository.findByIdAndOrganizationId(alertId, orgId)
                : alertRepository.findById(alertId))
                .map(alert -> {
                    alert.setAssignedTo(assignedTo);
                    alert.setAssignedAt(Instant.now());
                    if (priority != null) {
                        alert.setPriority(priority);
                    }
                    log.info("Alert {} assigned to {} with priority {}", alertId, assignedTo, priority);
                    return toDTO(alertRepository.save(alert));
                });
    }

    @Transactional
    public Optional<ThreatAlertDTO> updateNotes(Long alertId, String notes) {
        Long orgId = getOrgId();
        return (orgId != null
                ? alertRepository.findByIdAndOrganizationId(alertId, orgId)
                : alertRepository.findById(alertId))
                .map(alert -> {
                    alert.setNotes(notes);
                    log.info("Alert {} notes updated", alertId);
                    return toDTO(alertRepository.save(alert));
                });
    }

    @Transactional(readOnly = true)
    public Page<ThreatAlertDTO> findByAssignedTo(String assignedTo, Pageable pageable) {
        Long orgId = getOrgId();
        if (orgId != null) {
            return alertRepository.findByOrganizationIdAndAssignedTo(orgId, assignedTo, pageable)
                    .map(this::toDTO);
        }
        return alertRepository.findByAssignedTo(assignedTo, pageable).map(this::toDTO);
    }

    @Transactional(readOnly = true)
    public Page<ThreatAlertDTO> findUnassigned(Pageable pageable) {
        Long orgId = getOrgId();
        if (orgId != null) {
            return alertRepository.findByOrganizationIdAndAssignedToIsNull(orgId, pageable)
                    .map(this::toDTO);
        }
        return alertRepository.findByAssignedToIsNull(pageable).map(this::toDTO);
    }

    // ===== DEDUPLICATION METHODS =====

    /**
     * Compute a hash for alert deduplication based on narrative, type, and severity.
     */
    private String computeAlertHash(Long narrativeId, AlertType type, Severity severity) {
        String input = String.format("%d:%s:%s",
                narrativeId != null ? narrativeId : 0,
                type.name(),
                severity.name());
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            log.error("SHA-256 not available", e);
            return input.hashCode() + "";
        }
    }

    /**
     * Find an existing active alert with the same hash within the deduplication window.
     */
    @Transactional(readOnly = true)
    public Optional<ThreatAlert> findActiveAlertByHash(String hash, Long orgId) {
        Instant cutoff = Instant.now().minus(24, ChronoUnit.HOURS);
        return alertRepository.findByAlertHashAndStatusAndOrganizationIdAndTriggeredAtAfter(
                hash, AlertStatus.ACTIVE, orgId, cutoff);
    }

    /**
     * Create alert with deduplication. If a similar active alert exists within 24h,
     * increment its occurrence count instead of creating a new one.
     */
    @Transactional
    public ThreatAlertDTO createAlertWithDeduplication(
            Long narrativeId,
            AlertType type,
            Severity severity,
            String title,
            String description,
            Map<String, Object> metadata) {

        Long orgId = getOrgId();
        Narrative narrative = narrativeId != null
                ? (orgId != null
                        ? narrativeRepository.findByIdAndOrganizationId(narrativeId, orgId).orElse(null)
                        : narrativeRepository.findById(narrativeId).orElse(null))
                : null;

        Long alertOrgId = narrative != null ? narrative.getOrganizationId() : orgId;
        if (alertOrgId == null) {
            log.error("Cannot create alert: no organization context and no narrative provided.");
            throw new IllegalStateException("Organization context is required to create alerts.");
        }

        String hash = computeAlertHash(narrativeId, type, severity);

        // Check for existing active alert with same hash
        Optional<ThreatAlert> existing = findActiveAlertByHash(hash, alertOrgId);

        if (existing.isPresent()) {
            // Increment occurrence count instead of creating new alert
            ThreatAlert existingAlert = existing.get();
            existingAlert.setOccurrenceCount(existingAlert.getOccurrenceCount() + 1);
            existingAlert.setLastOccurredAt(Instant.now());
            log.info("Incrementing occurrence count for existing alert {}: now {} occurrences",
                    existingAlert.getId(), existingAlert.getOccurrenceCount());
            return toDTO(alertRepository.save(existingAlert));
        }

        // Create new alert with hash
        ThreatAlert alert = ThreatAlert.builder()
                .organizationId(alertOrgId)
                .narrative(narrative)
                .alertType(type)
                .severity(severity)
                .title(title)
                .description(description)
                .metadata(metadata != null ? metadata : Map.of())
                .status(AlertStatus.ACTIVE)
                .triggeredAt(Instant.now())
                .alertHash(hash)
                .occurrenceCount(1)
                .lastOccurredAt(Instant.now())
                .build();

        log.info("Created {} severity alert: {}", severity, title);
        ThreatAlert saved = alertRepository.save(alert);
        cacheEvictionService.evictDashboardCache(alertOrgId != 0L ? alertOrgId : 0L);
        return toDTO(saved);
    }

    /**
     * Auto-resolve stale alerts that haven't been updated in 7 days.
     * Runs daily at 2 AM.
     */
    @Scheduled(cron = "0 0 2 * * ?")
    @Transactional
    public void autoResolveStaleAlerts() {
        log.info("Starting auto-resolution of stale alerts...");
        Instant cutoff = Instant.now().minus(7, ChronoUnit.DAYS);

        List<ThreatAlert> staleAlerts = alertRepository.findStaleActiveAlerts(cutoff);
        int resolved = 0;

        for (ThreatAlert alert : staleAlerts) {
            alert.setStatus(AlertStatus.RESOLVED);
            alert.setResolvedAt(Instant.now());
            alert.setNotes((alert.getNotes() != null ? alert.getNotes() + "\n" : "") +
                    "[Auto-resolved: No activity for 7 days]");
            alertRepository.save(alert);
            resolved++;

            // Evict cache for the org
            cacheEvictionService.evictDashboardCache(
                    alert.getOrganizationId() != null ? alert.getOrganizationId() : 0L);
        }

        log.info("Auto-resolved {} stale alerts", resolved);
    }

    /**
     * Get count of grouped alerts (alerts with occurrence_count > 1).
     */
    @Transactional(readOnly = true)
    public long countGroupedAlerts() {
        Long orgId = getOrgId();
        if (orgId != null) {
            return alertRepository.countByOrganizationIdAndOccurrenceCountGreaterThan(orgId, 1);
        }
        return alertRepository.countByOccurrenceCountGreaterThan(1);
    }

    // ===== BULK OPERATIONS =====

    /**
     * Acknowledge multiple alerts at once.
     * @return count of alerts successfully acknowledged
     */
    @Transactional
    public int bulkAcknowledge(List<Long> alertIds, Long userId) {
        Long orgId = getOrgId();
        User user = userId != null ? userRepository.findById(userId).orElse(null) : null;
        int count = 0;

        List<ThreatAlert> alerts = orgId != null
                ? alertRepository.findAllById(alertIds).stream()
                    .filter(a -> orgId.equals(a.getOrganizationId()))
                    .toList()
                : alertRepository.findAllById(alertIds);

        for (ThreatAlert alert : alerts) {
            if (alert.getStatus() == AlertStatus.ACTIVE) {
                alert.setStatus(AlertStatus.ACKNOWLEDGED);
                alert.setAcknowledgedAt(Instant.now());
                if (user != null) {
                    alert.setAcknowledgedBy(user);
                }
                alertRepository.save(alert);
                count++;

                // WebSocket notification is best-effort - should not fail the operation
                try {
                    Long alertOrgId = alert.getOrganizationId() != null ? alert.getOrganizationId() : 0L;
                    webSocketService.notifyAlertStatusChange(alertOrgId, toDTO(alert));
                } catch (Exception e) {
                    log.warn("Failed to send WebSocket notification for alert {}: {}", alert.getId(), e.getMessage());
                }
            }
        }

        if (count > 0) {
            cacheEvictionService.evictDashboardCache(orgId != null ? orgId : 0L);
            log.info("Bulk acknowledged {} alerts by user {}", count, userId);
        }

        return count;
    }

    /**
     * Resolve multiple alerts at once.
     * @return count of alerts successfully resolved
     */
    @Transactional
    public int bulkResolve(List<Long> alertIds, Long userId) {
        Long orgId = getOrgId();
        User user = userId != null ? userRepository.findById(userId).orElse(null) : null;
        int count = 0;

        List<ThreatAlert> alerts = orgId != null
                ? alertRepository.findAllById(alertIds).stream()
                    .filter(a -> orgId.equals(a.getOrganizationId()))
                    .toList()
                : alertRepository.findAllById(alertIds);

        for (ThreatAlert alert : alerts) {
            if (alert.getStatus() == AlertStatus.ACTIVE || alert.getStatus() == AlertStatus.ACKNOWLEDGED) {
                alert.setStatus(AlertStatus.RESOLVED);
                alert.setResolvedAt(Instant.now());
                if (user != null) {
                    alert.setResolvedBy(user);
                }
                alertRepository.save(alert);
                count++;

                // WebSocket notification is best-effort - should not fail the operation
                try {
                    Long alertOrgId = alert.getOrganizationId() != null ? alert.getOrganizationId() : 0L;
                    webSocketService.notifyAlertStatusChange(alertOrgId, toDTO(alert));
                } catch (Exception e) {
                    log.warn("Failed to send WebSocket notification for alert {}: {}", alert.getId(), e.getMessage());
                }
            }
        }

        if (count > 0) {
            cacheEvictionService.evictDashboardCache(orgId != null ? orgId : 0L);
            log.info("Bulk resolved {} alerts by user {}", count, userId);
        }

        return count;
    }

    /**
     * Dismiss multiple alerts at once.
     * @return count of alerts successfully dismissed
     */
    @Transactional
    public int bulkDismiss(List<Long> alertIds) {
        Long orgId = getOrgId();
        int count = 0;

        List<ThreatAlert> alerts = orgId != null
                ? alertRepository.findAllById(alertIds).stream()
                    .filter(a -> orgId.equals(a.getOrganizationId()))
                    .toList()
                : alertRepository.findAllById(alertIds);

        for (ThreatAlert alert : alerts) {
            if (alert.getStatus() != AlertStatus.DISMISSED) {
                alert.setStatus(AlertStatus.DISMISSED);
                alertRepository.save(alert);
                count++;

                // WebSocket notification is best-effort - should not fail the operation
                try {
                    Long alertOrgId = alert.getOrganizationId() != null ? alert.getOrganizationId() : 0L;
                    webSocketService.notifyAlertStatusChange(alertOrgId, toDTO(alert));
                } catch (Exception e) {
                    log.warn("Failed to send WebSocket notification for alert {}: {}", alert.getId(), e.getMessage());
                }
            }
        }

        if (count > 0) {
            cacheEvictionService.evictDashboardCache(orgId != null ? orgId : 0L);
            log.info("Bulk dismissed {} alerts", count);
        }

        return count;
    }

    private ThreatAlertDTO toDTO(ThreatAlert alert) {
        return new ThreatAlertDTO(
                alert.getId(),
                alert.getNarrative() != null ? alert.getNarrative().getId() : null,
                alert.getNarrative() != null ? alert.getNarrative().getName() : null,
                alert.getAlertType().name(),
                alert.getSeverity().name(),
                alert.getTitle(),
                alert.getDescription(),
                alert.getTriggeredAt(),
                alert.getAcknowledgedAt(),
                alert.getAcknowledgedBy() != null ? alert.getAcknowledgedBy().getName() : null,
                alert.getResolvedAt(),
                alert.getResolvedBy() != null ? alert.getResolvedBy().getName() : null,
                alert.getStatus().name(),
                alert.getMetadata(),
                alert.getCreatedAt(),
                alert.getAssignedTo(),
                alert.getAssignedAt(),
                alert.getPriority(),
                alert.getNotes(),
                alert.getOccurrenceCount(),
                alert.getLastOccurredAt()
        );
    }
}
