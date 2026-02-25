package com.newssentiment.repository;

import com.newssentiment.model.Source;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SourceRepository extends JpaRepository<Source, Long> {

    // Organization-scoped queries
    List<Source> findByOrganizationId(Long organizationId);

    Optional<Source> findByIdAndOrganizationId(Long id, Long organizationId);

    List<Source> findByOrganizationIdAndActiveTrue(Long organizationId);

    List<Source> findByOrganizationIdAndLanguage(Long organizationId, Source.Language language);

    List<Source> findByOrganizationIdAndType(Long organizationId, Source.SourceType type);

    @Query("SELECT s FROM Source s WHERE s.organizationId = :orgId AND s.active = true AND s.type = :type")
    List<Source> findActiveByOrganizationIdAndType(@Param("orgId") Long orgId, @Param("type") Source.SourceType type);

    boolean existsByOrganizationIdAndUrl(Long organizationId, String url);

    long countByOrganizationIdAndActiveTrue(Long organizationId);

    long countByOrganizationId(Long organizationId);

    // Legacy queries (for internal/system use)
    List<Source> findByActiveTrue();

    List<Source> findByLanguage(Source.Language language);

    List<Source> findByType(Source.SourceType type);

    @Query("SELECT s FROM Source s WHERE s.active = true AND s.type = :type")
    List<Source> findActiveByType(Source.SourceType type);

    boolean existsByUrl(String url);

    long countByActiveTrue();
}
