package com.newssentiment.repository;

import com.newssentiment.model.FactCheck;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FactCheckRepository extends JpaRepository<FactCheck, Long> {

    List<FactCheck> findByNarrativeIdOrderByAddedAtDesc(Long narrativeId);

    List<FactCheck> findByNarrativeIdAndOrganizationIdOrderByAddedAtDesc(Long narrativeId, Long organizationId);

    Optional<FactCheck> findByIdAndOrganizationId(Long id, Long organizationId);

    long countByNarrativeId(Long narrativeId);

    @Query("SELECT COUNT(fc) > 0 FROM FactCheck fc WHERE fc.narrative.id = :narrativeId")
    boolean existsByNarrativeId(@Param("narrativeId") Long narrativeId);

    @Query("SELECT DISTINCT fc.narrative.id FROM FactCheck fc WHERE fc.organizationId = :orgId")
    List<Long> findNarrativeIdsWithFactChecks(@Param("orgId") Long orgId);
}
