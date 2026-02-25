package com.newssentiment.repository;

import com.newssentiment.model.ThreatAlert;
import com.newssentiment.model.ThreatAlert.AlertStatus;
import com.newssentiment.model.ThreatAlert.AlertType;
import com.newssentiment.model.ThreatAlert.Severity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface ThreatAlertRepository extends JpaRepository<ThreatAlert, Long> {

    // Organization-scoped queries
    List<ThreatAlert> findByOrganizationId(Long organizationId);

    Optional<ThreatAlert> findByIdAndOrganizationId(Long id, Long organizationId);

    List<ThreatAlert> findByOrganizationIdAndStatus(Long organizationId, AlertStatus status);

    List<ThreatAlert> findByOrganizationIdAndSeverity(Long organizationId, Severity severity);

    List<ThreatAlert> findByOrganizationIdAndNarrativeId(Long organizationId, Long narrativeId);

    @Query("SELECT a FROM ThreatAlert a WHERE a.organizationId = :orgId AND a.status = :status ORDER BY a.severity DESC, a.triggeredAt DESC")
    List<ThreatAlert> findByOrganizationIdAndStatusOrderBySeverity(@Param("orgId") Long orgId, @Param("status") AlertStatus status);

    @Query("SELECT a FROM ThreatAlert a WHERE a.organizationId = :orgId AND a.status IN :statuses ORDER BY a.triggeredAt DESC")
    Page<ThreatAlert> findByOrganizationIdAndStatusIn(@Param("orgId") Long orgId, @Param("statuses") List<AlertStatus> statuses, Pageable pageable);

    @Query("SELECT a FROM ThreatAlert a WHERE a.organizationId = :orgId AND a.triggeredAt >= :since ORDER BY a.triggeredAt DESC")
    List<ThreatAlert> findByOrganizationIdAndTriggeredSince(@Param("orgId") Long orgId, @Param("since") Instant since);

    @Query("SELECT a FROM ThreatAlert a WHERE a.organizationId = :orgId AND a.status = 'ACTIVE' AND a.severity IN ('HIGH', 'CRITICAL') ORDER BY a.triggeredAt DESC")
    List<ThreatAlert> findByOrganizationIdAndUrgent(@Param("orgId") Long orgId);

    @Query("SELECT COUNT(a) FROM ThreatAlert a WHERE a.organizationId = :orgId AND a.status = :status")
    long countByOrganizationIdAndStatus(@Param("orgId") Long orgId, @Param("status") AlertStatus status);

    @Query("SELECT COUNT(a) FROM ThreatAlert a WHERE a.organizationId = :orgId AND a.severity = :severity AND a.status = 'ACTIVE'")
    long countByOrganizationIdAndActiveBySeverity(@Param("orgId") Long orgId, @Param("severity") Severity severity);

    @Query("SELECT a FROM ThreatAlert a WHERE a.organizationId = :orgId AND " +
           "(:status IS NULL OR a.status = :status) AND " +
           "(:severity IS NULL OR a.severity = :severity) AND " +
           "(:alertType IS NULL OR a.alertType = :alertType) AND " +
           "(:narrativeId IS NULL OR a.narrative.id = :narrativeId) " +
           "ORDER BY a.triggeredAt DESC")
    Page<ThreatAlert> findByOrganizationIdWithFilters(
            @Param("orgId") Long orgId,
            @Param("status") AlertStatus status,
            @Param("severity") Severity severity,
            @Param("alertType") AlertType alertType,
            @Param("narrativeId") Long narrativeId,
            Pageable pageable);

    @Query("SELECT COUNT(a) FROM ThreatAlert a WHERE a.organizationId = :orgId AND a.triggeredAt >= :since")
    long countByOrganizationIdAndTriggeredAtAfter(@Param("orgId") Long orgId, @Param("since") Instant since);

    // Legacy queries (for internal/system use)
    List<ThreatAlert> findByStatus(AlertStatus status);

    List<ThreatAlert> findBySeverity(Severity severity);

    List<ThreatAlert> findByNarrativeId(Long narrativeId);

    @Query("SELECT a FROM ThreatAlert a WHERE a.status = :status ORDER BY a.severity DESC, a.triggeredAt DESC")
    List<ThreatAlert> findActiveOrderBySeverity(@Param("status") AlertStatus status);

    @Query("SELECT a FROM ThreatAlert a WHERE a.status IN :statuses ORDER BY a.triggeredAt DESC")
    Page<ThreatAlert> findByStatusIn(@Param("statuses") List<AlertStatus> statuses, Pageable pageable);

    @Query("SELECT a FROM ThreatAlert a WHERE a.triggeredAt >= :since ORDER BY a.triggeredAt DESC")
    List<ThreatAlert> findTriggeredSince(@Param("since") Instant since);

    @Query("SELECT a FROM ThreatAlert a WHERE a.status = 'ACTIVE' AND a.severity IN ('HIGH', 'CRITICAL') ORDER BY a.triggeredAt DESC")
    List<ThreatAlert> findUrgentAlerts();

    @Query("SELECT COUNT(a) FROM ThreatAlert a WHERE a.status = :status")
    long countByStatus(@Param("status") AlertStatus status);

    @Query("SELECT COUNT(a) FROM ThreatAlert a WHERE a.severity = :severity AND a.status = 'ACTIVE'")
    long countActiveBySeverity(@Param("severity") Severity severity);

    @Query("SELECT a FROM ThreatAlert a WHERE " +
           "(:status IS NULL OR a.status = :status) AND " +
           "(:severity IS NULL OR a.severity = :severity) AND " +
           "(:alertType IS NULL OR a.alertType = :alertType) AND " +
           "(:narrativeId IS NULL OR a.narrative.id = :narrativeId) " +
           "ORDER BY a.triggeredAt DESC")
    Page<ThreatAlert> findWithFilters(
            @Param("status") AlertStatus status,
            @Param("severity") Severity severity,
            @Param("alertType") AlertType alertType,
            @Param("narrativeId") Long narrativeId,
            Pageable pageable);

    @Query("SELECT COUNT(a) FROM ThreatAlert a WHERE a.severity = :severity")
    long countBySeverity(@Param("severity") Severity severity);

    long countByTriggeredAtAfter(Instant since);

    // Assignment queries
    Page<ThreatAlert> findByAssignedTo(String assignedTo, Pageable pageable);

    Page<ThreatAlert> findByAssignedToIsNull(Pageable pageable);

    @Query("SELECT a FROM ThreatAlert a WHERE a.organizationId = :orgId AND a.assignedTo = :assignedTo ORDER BY a.priority DESC, a.triggeredAt DESC")
    Page<ThreatAlert> findByOrganizationIdAndAssignedTo(@Param("orgId") Long orgId, @Param("assignedTo") String assignedTo, Pageable pageable);

    @Query("SELECT a FROM ThreatAlert a WHERE a.organizationId = :orgId AND a.assignedTo IS NULL ORDER BY a.triggeredAt DESC")
    Page<ThreatAlert> findByOrganizationIdAndAssignedToIsNull(@Param("orgId") Long orgId, Pageable pageable);

    // Deduplication queries
    @Query("SELECT a FROM ThreatAlert a WHERE a.alertHash = :hash AND a.status = :status " +
           "AND a.organizationId = :orgId AND a.triggeredAt > :cutoff ORDER BY a.triggeredAt DESC")
    Optional<ThreatAlert> findByAlertHashAndStatusAndOrganizationIdAndTriggeredAtAfter(
            @Param("hash") String hash,
            @Param("status") AlertStatus status,
            @Param("orgId") Long orgId,
            @Param("cutoff") Instant cutoff);

    @Query("SELECT a FROM ThreatAlert a WHERE a.status = 'ACTIVE' AND " +
           "(a.lastOccurredAt < :cutoff OR (a.lastOccurredAt IS NULL AND a.triggeredAt < :cutoff))")
    List<ThreatAlert> findStaleActiveAlerts(@Param("cutoff") Instant cutoff);

    @Query("SELECT COUNT(a) FROM ThreatAlert a WHERE a.occurrenceCount > :count")
    long countByOccurrenceCountGreaterThan(@Param("count") int count);

    @Query("SELECT COUNT(a) FROM ThreatAlert a WHERE a.organizationId = :orgId AND a.occurrenceCount > :count")
    long countByOrganizationIdAndOccurrenceCountGreaterThan(@Param("orgId") Long orgId, @Param("count") int count);

    // Search queries for global search
    @Query("SELECT a FROM ThreatAlert a WHERE " +
           "LOWER(a.title) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(a.description) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "ORDER BY a.triggeredAt DESC")
    List<ThreatAlert> searchByTitleOrDescription(@Param("query") String query, Pageable pageable);

    @Query("SELECT a FROM ThreatAlert a WHERE a.organizationId = :orgId AND (" +
           "LOWER(a.title) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(a.description) LIKE LOWER(CONCAT('%', :query, '%'))) " +
           "ORDER BY a.triggeredAt DESC")
    List<ThreatAlert> searchByOrganizationIdAndTitleOrDescription(@Param("orgId") Long orgId, @Param("query") String query, Pageable pageable);
}
