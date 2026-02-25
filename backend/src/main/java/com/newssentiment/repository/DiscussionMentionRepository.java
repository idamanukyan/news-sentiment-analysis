package com.newssentiment.repository;

import com.newssentiment.model.DiscussionMention;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DiscussionMentionRepository extends JpaRepository<DiscussionMention, Long> {

    List<DiscussionMention> findByMentionedUserIdOrderByCreatedAtDesc(Long userId);

    List<DiscussionMention> findByMentionedUserIdAndIsReadFalseOrderByCreatedAtDesc(Long userId);

    long countByMentionedUserIdAndIsReadFalse(Long userId);

    @Modifying
    @Query("UPDATE DiscussionMention m SET m.isRead = true WHERE m.mentionedUser.id = :userId AND m.isRead = false")
    int markAllAsRead(@Param("userId") Long userId);

    @Modifying
    @Query("UPDATE DiscussionMention m SET m.isRead = true WHERE m.id = :id AND m.mentionedUser.id = :userId")
    int markAsRead(@Param("id") Long id, @Param("userId") Long userId);
}
