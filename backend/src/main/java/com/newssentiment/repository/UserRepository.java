package com.newssentiment.repository;

import com.newssentiment.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    @Query("SELECT u FROM User u WHERE u.emailNotificationsEnabled = true AND u.reportFrequency = :frequency AND u.enabled = true")
    List<User> findUsersForScheduledReports(User.ReportFrequency frequency);

    @Query("SELECT u FROM User u WHERE u.alertNotificationsEnabled = true AND u.enabled = true")
    List<User> findUsersWithAlertNotificationsEnabled();

    List<User> findByOrganization_IdOrderByCreatedAtDesc(Long organizationId);

    long countByOrganization_Id(Long organizationId);

    Optional<User> findByIdAndOrganization_Id(Long id, Long organizationId);
}
