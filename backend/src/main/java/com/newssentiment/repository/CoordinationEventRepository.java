package com.newssentiment.repository;

import com.newssentiment.model.CoordinationEvent;
import com.newssentiment.model.CoordinationEvent.EventStatus;
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
public interface CoordinationEventRepository extends JpaRepository<CoordinationEvent, Long> {

    // Organization-scoped queries
    List<CoordinationEvent> findByOrganizationId(Long organizationId);

    Page<CoordinationEvent> findByOrganizationIdOrderByDetectedAtDesc(Long organizationId, Pageable pageable);

    Optional<CoordinationEvent> findByIdAndOrganizationId(Long id, Long organizationId);

    List<CoordinationEvent> findByOrganizationIdAndNarrativeId(Long organizationId, Long narrativeId);

    List<CoordinationEvent> findByOrganizationIdAndStatus(Long organizationId, EventStatus status);

    @Query("SELECT c FROM CoordinationEvent c WHERE c.organizationId = :orgId AND c.status = :status ORDER BY c.detectedAt DESC")
    List<CoordinationEvent> findByOrganizationIdAndStatusOrderByDetectedAtDesc(
            @Param("orgId") Long orgId,
            @Param("status") EventStatus status);

    @Query("SELECT c FROM CoordinationEvent c WHERE c.organizationId = :orgId AND c.detectedAt >= :since ORDER BY c.detectedAt DESC")
    List<CoordinationEvent> findByOrganizationIdAndDetectedAtAfter(
            @Param("orgId") Long orgId,
            @Param("since") Instant since);

    @Query("SELECT COUNT(c) FROM CoordinationEvent c WHERE c.organizationId = :orgId AND c.status = :status")
    long countByOrganizationIdAndStatus(@Param("orgId") Long orgId, @Param("status") EventStatus status);

    @Query("SELECT COUNT(c) FROM CoordinationEvent c WHERE c.organizationId = :orgId AND c.detectedAt >= :since")
    long countByOrganizationIdAndDetectedAtAfter(@Param("orgId") Long orgId, @Param("since") Instant since);

    // Query for narrative detail page
    @Query("SELECT c FROM CoordinationEvent c WHERE c.organizationId = :orgId AND c.narrative.id = :narrativeId ORDER BY c.detectedAt DESC")
    List<CoordinationEvent> findByOrganizationIdAndNarrativeIdOrderByDetectedAtDesc(
            @Param("orgId") Long orgId,
            @Param("narrativeId") Long narrativeId);

    // Check if narrative has any coordination events
    @Query("SELECT COUNT(c) > 0 FROM CoordinationEvent c WHERE c.narrative.id = :narrativeId AND c.status = 'ACTIVE'")
    boolean hasActiveCoordinationEvents(@Param("narrativeId") Long narrativeId);

    // Count coordination events for a narrative
    @Query("SELECT COUNT(c) FROM CoordinationEvent c WHERE c.narrative.id = :narrativeId")
    int countByNarrativeId(@Param("narrativeId") Long narrativeId);

    // Legacy queries (for internal/system use)
    List<CoordinationEvent> findByNarrativeId(Long narrativeId);

    List<CoordinationEvent> findByStatusOrderByDetectedAtDesc(EventStatus status);

    @Query("SELECT c FROM CoordinationEvent c WHERE c.detectedAt >= :since ORDER BY c.detectedAt DESC")
    List<CoordinationEvent> findByDetectedAtAfter(@Param("since") Instant since);

    @Query("SELECT COUNT(c) FROM CoordinationEvent c WHERE c.status = :status")
    long countByStatus(@Param("status") EventStatus status);

    @Query("SELECT COUNT(c) FROM CoordinationEvent c WHERE c.detectedAt >= :since")
    long countByDetectedAtAfter(@Param("since") Instant since);
}
