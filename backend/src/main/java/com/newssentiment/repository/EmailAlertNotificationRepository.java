package com.newssentiment.repository;

import com.newssentiment.model.EmailAlertNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EmailAlertNotificationRepository extends JpaRepository<EmailAlertNotification, Long> {

    List<EmailAlertNotification> findByUserIdOrderBySentAtDesc(Long userId);

    Optional<EmailAlertNotification> findByUserIdAndAlertId(Long userId, Long alertId);

    boolean existsByUserIdAndAlertId(Long userId, Long alertId);

    @Query("SELECT ean.alert.id FROM EmailAlertNotification ean WHERE ean.user.id = :userId")
    List<Long> findAlertIdsByUserId(Long userId);
}
