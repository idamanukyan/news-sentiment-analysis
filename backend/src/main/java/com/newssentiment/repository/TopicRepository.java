package com.newssentiment.repository;

import com.newssentiment.model.Topic;
import com.newssentiment.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TopicRepository extends JpaRepository<Topic, Long> {

    List<Topic> findByUserId(Long userId);

    List<Topic> findByUserOrderByCreatedAtDesc(User user);

    Optional<Topic> findByIdAndUser(Long id, User user);

    List<Topic> findByGlobalSearchTrue();

    long countByUserId(Long userId);
}
