package com.newssentiment.repository;

import com.newssentiment.model.Alert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AlertRepository extends JpaRepository<Alert, Long> {

    // Organization-scoped queries
    List<Alert> findByOrganizationId(Long organizationId);

    Optional<Alert> findByIdAndOrganizationId(Long id, Long organizationId);

    List<Alert> findByOrganizationIdAndActiveTrue(Long organizationId);

    List<Alert> findByOrganizationIdAndUserId(Long organizationId, Long userId);

    List<Alert> findByOrganizationIdAndUserIdAndActiveTrue(Long organizationId, Long userId);

    // Legacy queries
    List<Alert> findByUserId(Long userId);

    List<Alert> findByActiveTrue();

    List<Alert> findByUserIdAndActiveTrue(Long userId);
}
