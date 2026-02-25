package com.newssentiment.service;

import com.newssentiment.dto.ReportDTO;
import com.newssentiment.model.ThreatAlert;
import com.newssentiment.model.User;
import com.newssentiment.repository.ThreatAlertRepository;
import com.newssentiment.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ScheduledReportService {

    private final UserRepository userRepository;
    private final ReportService reportService;
    private final EmailService emailService;
    private final ThreatAlertRepository alertRepository;

    /**
     * Send daily reports every day at 8:00 AM Yerevan time (04:00 UTC)
     */
    @Scheduled(cron = "0 0 4 * * *", zone = "UTC")
    @Transactional(readOnly = true)
    public void sendDailyReports() {
        log.info("Starting daily report distribution");

        List<User> recipients = userRepository.findUsersForScheduledReports(User.ReportFrequency.DAILY);
        if (recipients.isEmpty()) {
            log.info("No users subscribed to daily reports");
            return;
        }

        ReportDTO report = reportService.generateDailyReport();

        int sent = 0;
        for (User user : recipients) {
            try {
                emailService.sendReport(user, report);
                sent++;
            } catch (Exception e) {
                log.error("Failed to send daily report to {}: {}", user.getEmail(), e.getMessage());
            }
        }

        log.info("Daily report distribution complete. Sent to {}/{} users", sent, recipients.size());
    }

    /**
     * Send weekly reports every Monday at 9:00 AM Yerevan time (05:00 UTC)
     */
    @Scheduled(cron = "0 0 5 * * MON", zone = "UTC")
    @Transactional(readOnly = true)
    public void sendWeeklyReports() {
        log.info("Starting weekly report distribution");

        List<User> recipients = userRepository.findUsersForScheduledReports(User.ReportFrequency.WEEKLY);
        if (recipients.isEmpty()) {
            log.info("No users subscribed to weekly reports");
            return;
        }

        ReportDTO report = reportService.generateWeeklyReport();

        int sent = 0;
        for (User user : recipients) {
            try {
                emailService.sendReport(user, report);
                sent++;
            } catch (Exception e) {
                log.error("Failed to send weekly report to {}: {}", user.getEmail(), e.getMessage());
            }
        }

        log.info("Weekly report distribution complete. Sent to {}/{} users", sent, recipients.size());
    }

    /**
     * Check for new high-priority alerts every 15 minutes and notify users
     */
    @Scheduled(fixedRate = 900000) // 15 minutes in milliseconds
    @Transactional(readOnly = true)
    public void sendAlertNotifications() {
        Instant since = Instant.now().minus(15, ChronoUnit.MINUTES);
        List<ThreatAlert> recentAlerts = alertRepository.findTriggeredSince(since);

        if (recentAlerts.isEmpty()) {
            return;
        }

        log.info("Found {} new alerts to notify", recentAlerts.size());

        List<User> recipients = userRepository.findUsersWithAlertNotificationsEnabled();
        if (recipients.isEmpty()) {
            log.debug("No users with alert notifications enabled");
            return;
        }

        int notificationsSent = 0;
        for (ThreatAlert alert : recentAlerts) {
            for (User user : recipients) {
                try {
                    emailService.sendAlertNotification(user, alert);
                    notificationsSent++;
                } catch (Exception e) {
                    log.error("Failed to send alert notification to {} for alert {}: {}",
                            user.getEmail(), alert.getId(), e.getMessage());
                }
            }
        }

        log.info("Alert notification distribution complete. Sent {} notifications", notificationsSent);
    }

    /**
     * Manually trigger a report send for testing purposes
     */
    public void sendTestReport(User user, String type) {
        ReportDTO report = switch (type.toUpperCase()) {
            case "DAILY" -> reportService.generateDailyReport();
            case "WEEKLY" -> reportService.generateWeeklyReport();
            default -> throw new IllegalArgumentException("Unknown report type: " + type);
        };

        emailService.sendReport(user, report);
        log.info("Sent test {} report to {}", type, user.getEmail());
    }
}
