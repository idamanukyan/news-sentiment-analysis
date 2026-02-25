package com.newssentiment.repository;

import com.newssentiment.model.AlertRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AlertRuleRepository extends JpaRepository<AlertRule, Long> {

    // Organization-scoped queries
    List<AlertRule> findByOrganizationId(Long organizationId);

    Optional<AlertRule> findByIdAndOrganizationId(Long id, Long organizationId);

    List<AlertRule> findByOrganizationIdAndEnabledTrue(Long organizationId);

    List<AlertRule> findByOrganizationIdAndCreatedByIdOrderByCreatedAtDesc(Long organizationId, Long userId);

    @Query("SELECT ar FROM AlertRule ar WHERE ar.organizationId = :orgId AND ar.enabled = true ORDER BY ar.createdAt DESC")
    List<AlertRule> findByOrganizationIdAndEnabledOrderByCreatedAtDesc(@Param("orgId") Long orgId);

    @Query("SELECT ar FROM AlertRule ar WHERE ar.organizationId = :orgId ORDER BY ar.createdAt DESC")
    List<AlertRule> findByOrganizationIdOrderByCreatedAtDesc(@Param("orgId") Long orgId);

    long countByOrganizationIdAndCreatedById(Long organizationId, Long userId);

    long countByOrganizationIdAndEnabledTrue(Long organizationId);

    // Legacy queries (for internal/system use - e.g., scheduled evaluation)
    List<AlertRule> findByEnabledTrue();

    List<AlertRule> findByCreatedByIdOrderByCreatedAtDesc(Long userId);

    @Query("SELECT ar FROM AlertRule ar WHERE ar.enabled = true ORDER BY ar.createdAt DESC")
    List<AlertRule> findAllEnabledOrderByCreatedAtDesc();

    @Query("SELECT ar FROM AlertRule ar ORDER BY ar.createdAt DESC")
    List<AlertRule> findAllOrderByCreatedAtDesc();

    long countByCreatedById(Long userId);

    long countByEnabledTrue();
}
