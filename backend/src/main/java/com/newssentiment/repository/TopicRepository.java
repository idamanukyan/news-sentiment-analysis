package com.newssentiment.repository;

import com.newssentiment.model.Topic;
import com.newssentiment.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TopicRepository extends JpaRepository<Topic, Long> {

    // Organization-scoped queries
    List<Topic> findByOrganizationId(Long organizationId);

    Optional<Topic> findByIdAndOrganizationId(Long id, Long organizationId);

    List<Topic> findByOrganizationIdAndUserId(Long organizationId, Long userId);

    @Query("SELECT t FROM Topic t WHERE t.organizationId = :orgId ORDER BY t.createdAt DESC")
    List<Topic> findByOrganizationIdOrderByCreatedAtDesc(@Param("orgId") Long orgId);

    List<Topic> findByOrganizationIdAndGlobalSearchTrue(Long organizationId);

    long countByOrganizationId(Long organizationId);

    long countByOrganizationIdAndUserId(Long organizationId, Long userId);

    // Legacy queries (user-scoped within org)
    List<Topic> findByUserId(Long userId);

    List<Topic> findByUserOrderByCreatedAtDesc(User user);

    Optional<Topic> findByIdAndUser(Long id, User user);

    List<Topic> findByGlobalSearchTrue();

    long countByUserId(Long userId);
}
