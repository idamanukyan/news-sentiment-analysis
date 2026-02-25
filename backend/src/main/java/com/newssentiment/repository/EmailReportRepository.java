package com.newssentiment.repository;

import com.newssentiment.model.EmailReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface EmailReportRepository extends JpaRepository<EmailReport, Long> {

    List<EmailReport> findByUserIdOrderBySentAtDesc(Long userId);

    @Query("SELECT er FROM EmailReport er WHERE er.user.id = :userId AND er.reportType = :reportType ORDER BY er.sentAt DESC")
    List<EmailReport> findByUserIdAndReportType(Long userId, String reportType);

    @Query("SELECT er FROM EmailReport er WHERE er.user.id = :userId ORDER BY er.sentAt DESC LIMIT 1")
    Optional<EmailReport> findLatestByUserId(Long userId);

    List<EmailReport> findBySentAtAfter(Instant since);
}
