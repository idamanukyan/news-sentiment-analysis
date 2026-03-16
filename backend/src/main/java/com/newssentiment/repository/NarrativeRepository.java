package com.newssentiment.repository;

import com.newssentiment.model.Narrative;
import com.newssentiment.model.Narrative.NarrativeStatus;
import com.newssentiment.model.Narrative.ThreatLevel;
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
public interface NarrativeRepository extends JpaRepository<Narrative, Long> {

    // Organization-scoped queries
    List<Narrative> findByOrganizationId(Long organizationId);

    Page<Narrative> findByOrganizationId(Long organizationId, Pageable pageable);

    Optional<Narrative> findByIdAndOrganizationId(Long id, Long organizationId);

    Optional<Narrative> findByOrganizationIdAndName(Long organizationId, String name);

    List<Narrative> findByOrganizationIdAndStatus(Long organizationId, NarrativeStatus status);

    List<Narrative> findByOrganizationIdAndThreatLevel(Long organizationId, ThreatLevel threatLevel);

    @Query("SELECT n FROM Narrative n WHERE n.organizationId = :orgId AND n.status = :status ORDER BY n.articleCount DESC")
    List<Narrative> findByOrganizationIdAndStatusOrderByArticleCount(@Param("orgId") Long orgId, @Param("status") NarrativeStatus status);

    @Query("SELECT n FROM Narrative n WHERE n.organizationId = :orgId AND n.status IN :statuses ORDER BY n.threatLevel DESC, n.articleCount DESC")
    Page<Narrative> findByOrganizationIdAndStatusIn(@Param("orgId") Long orgId, @Param("statuses") List<NarrativeStatus> statuses, Pageable pageable);

    @Query("SELECT n FROM Narrative n WHERE n.organizationId = :orgId AND n.lastSeen >= :since ORDER BY n.lastSeen DESC")
    List<Narrative> findByOrganizationIdAndRecentlyActive(@Param("orgId") Long orgId, @Param("since") Instant since);

    @Query("SELECT COUNT(n) FROM Narrative n WHERE n.organizationId = :orgId AND n.status = :status")
    long countByOrganizationIdAndStatus(@Param("orgId") Long orgId, @Param("status") NarrativeStatus status);

    @Query("SELECT COUNT(n) FROM Narrative n WHERE n.organizationId = :orgId AND n.threatLevel = :level AND n.status = 'ACTIVE'")
    long countByOrganizationIdAndActiveByThreatLevel(@Param("orgId") Long orgId, @Param("level") ThreatLevel level);

    @Query("SELECT n FROM Narrative n WHERE n.organizationId = :orgId AND (" +
           "LOWER(n.name) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(n.description) LIKE LOWER(CONCAT('%', :query, '%')))")
    Page<Narrative> searchByOrganizationIdAndNameOrDescription(@Param("orgId") Long orgId, @Param("query") String query, Pageable pageable);

    @Query("SELECT COUNT(n) FROM Narrative n WHERE n.organizationId = :orgId AND n.status = 'ACTIVE'")
    long countByOrganizationIdAndActive(@Param("orgId") Long orgId);

    @Query("SELECT COUNT(n) FROM Narrative n WHERE n.organizationId = :orgId AND n.status = 'PENDING_REVIEW'")
    long countByOrganizationIdAndPendingReview(@Param("orgId") Long orgId);

    @Query("SELECT n FROM Narrative n WHERE n.organizationId = :orgId AND n.status != 'PENDING_REVIEW' ORDER BY n.lastSeen DESC")
    Page<Narrative> findByOrganizationIdExcludingPendingReview(@Param("orgId") Long orgId, Pageable pageable);

    @Query("SELECT n FROM Narrative n WHERE n.organizationId = :orgId AND n.status = 'PENDING_REVIEW' ORDER BY n.createdAt DESC")
    Page<Narrative> findByOrganizationIdAndPendingReview(@Param("orgId") Long orgId, Pageable pageable);

    // Legacy queries (for internal/system use)
    Optional<Narrative> findByName(String name);

    List<Narrative> findByStatus(NarrativeStatus status);

    List<Narrative> findByThreatLevel(ThreatLevel threatLevel);

    @Query("SELECT n FROM Narrative n WHERE n.status = :status ORDER BY n.articleCount DESC")
    List<Narrative> findActiveOrderByArticleCount(@Param("status") NarrativeStatus status);

    @Query("SELECT n FROM Narrative n WHERE n.status IN :statuses ORDER BY n.threatLevel DESC, n.articleCount DESC")
    Page<Narrative> findByStatusIn(@Param("statuses") List<NarrativeStatus> statuses, Pageable pageable);

    @Query("SELECT n FROM Narrative n WHERE n.lastSeen >= :since ORDER BY n.lastSeen DESC")
    List<Narrative> findRecentlyActive(@Param("since") Instant since);

    @Query("SELECT COUNT(n) FROM Narrative n WHERE n.status = :status")
    long countByStatus(@Param("status") NarrativeStatus status);

    @Query("SELECT COUNT(n) FROM Narrative n WHERE n.threatLevel = :level AND n.status = 'ACTIVE'")
    long countActiveByThreatLevel(@Param("level") ThreatLevel level);

    @Query("SELECT n FROM Narrative n WHERE " +
           "LOWER(n.name) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(n.description) LIKE LOWER(CONCAT('%', :query, '%'))")
    Page<Narrative> searchByNameOrDescription(@Param("query") String query, Pageable pageable);

    @Query("SELECT COUNT(n) FROM Narrative n WHERE n.status = 'ACTIVE'")
    long countActiveNarratives();

    // Simple search for global search endpoint (returns List with limit)
    @Query("SELECT n FROM Narrative n WHERE " +
           "LOWER(n.name) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(n.description) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "ORDER BY n.articleCount DESC")
    List<Narrative> searchByNameOrDescriptionList(@Param("query") String query, Pageable pageable);
}
