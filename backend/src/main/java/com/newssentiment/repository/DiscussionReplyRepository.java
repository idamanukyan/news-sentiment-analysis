package com.newssentiment.repository;

import com.newssentiment.model.DiscussionReply;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DiscussionReplyRepository extends JpaRepository<DiscussionReply, Long> {

    List<DiscussionReply> findByThreadIdOrderByCreatedAtAsc(Long threadId);

    Optional<DiscussionReply> findByIdAndThreadOrganizationId(Long id, Long organizationId);

    long countByThreadId(Long threadId);
}
