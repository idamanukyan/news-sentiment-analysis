package com.newssentiment.repository;

import com.newssentiment.model.DiscussionThread;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DiscussionThreadRepository extends JpaRepository<DiscussionThread, Long> {

    List<DiscussionThread> findByOrganizationIdOrderByPinnedDescCreatedAtDesc(Long organizationId);

    Optional<DiscussionThread> findByIdAndOrganizationId(Long id, Long organizationId);

    @Query("SELECT t FROM DiscussionThread t LEFT JOIN FETCH t.replies WHERE t.id = :id AND t.organizationId = :organizationId")
    Optional<DiscussionThread> findByIdAndOrganizationIdWithReplies(Long id, Long organizationId);

    long countByOrganizationId(Long organizationId);
}
