package com.newssentiment.service;

import com.newssentiment.dto.ReportDTO;
import com.newssentiment.dto.ThreatAlertDTO;
import com.newssentiment.model.EmailAlertNotification;
import com.newssentiment.model.EmailReport;
import com.newssentiment.model.ThreatAlert;
import com.newssentiment.model.User;
import com.newssentiment.repository.EmailAlertNotificationRepository;
import com.newssentiment.repository.EmailReportRepository;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;
    private final EmailReportRepository emailReportRepository;
    private final EmailAlertNotificationRepository alertNotificationRepository;

    @Value("${spring.mail.username:noreply@aiim.am}")
    private String fromEmail;

    @Value("${app.base-url:http://localhost:5173}")
    private String baseUrl;

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter
            .ofPattern("MMMM d, yyyy")
            .withZone(ZoneId.of("Asia/Yerevan"));

    private static final DateTimeFormatter DATETIME_FORMAT = DateTimeFormatter
            .ofPattern("MMM d, yyyy HH:mm")
            .withZone(ZoneId.of("Asia/Yerevan"));

    @Transactional
    public void sendReport(User user, ReportDTO report) {
        if (!Boolean.TRUE.equals(user.getEmailNotificationsEnabled())) {
            log.debug("Email notifications disabled for user {}", user.getEmail());
            return;
        }

        EmailReport emailRecord = EmailReport.builder()
                .user(user)
                .reportType(report.type())
                .status(EmailReport.Status.PENDING)
                .build();

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(user.getEmail());
            helper.setSubject(getReportSubject(report));
            helper.setText(buildReportPlainText(report), buildReportHtml(report, user));

            mailSender.send(message);

            emailRecord.setStatus(EmailReport.Status.SENT);
            log.info("Sent {} report to {}", report.type(), user.getEmail());
        } catch (MessagingException e) {
            emailRecord.setStatus(EmailReport.Status.FAILED);
            emailRecord.setErrorMessage(e.getMessage());
            log.error("Failed to send report to {}: {}", user.getEmail(), e.getMessage());
        }

        emailReportRepository.save(emailRecord);
    }

    @Transactional
    public void sendAlertNotification(User user, ThreatAlert alert) {
        if (!Boolean.TRUE.equals(user.getAlertNotificationsEnabled())) {
            log.debug("Alert notifications disabled for user {}", user.getEmail());
            return;
        }

        // Check severity threshold
        if (!meetsThreshold(alert.getSeverity(), user.getAlertSeverityThreshold())) {
            log.debug("Alert {} does not meet severity threshold for user {}", alert.getId(), user.getEmail());
            return;
        }

        // Check if already notified
        if (alertNotificationRepository.existsByUserIdAndAlertId(user.getId(), alert.getId())) {
            log.debug("User {} already notified about alert {}", user.getEmail(), alert.getId());
            return;
        }

        EmailAlertNotification notification = EmailAlertNotification.builder()
                .user(user)
                .alert(alert)
                .status(EmailAlertNotification.Status.PENDING)
                .build();

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(user.getEmail());
            helper.setSubject(getAlertSubject(alert));
            helper.setText(buildAlertPlainText(alert), buildAlertHtml(alert, user));

            mailSender.send(message);

            notification.setStatus(EmailAlertNotification.Status.SENT);
            log.info("Sent alert notification to {} for alert {}", user.getEmail(), alert.getId());
        } catch (MessagingException e) {
            notification.setStatus(EmailAlertNotification.Status.FAILED);
            notification.setErrorMessage(e.getMessage());
            log.error("Failed to send alert notification to {}: {}", user.getEmail(), e.getMessage());
        }

        alertNotificationRepository.save(notification);
    }

    private boolean meetsThreshold(ThreatAlert.Severity alertSeverity, User.AlertSeverity threshold) {
        if (threshold == null) return true;
        return alertSeverity.ordinal() >= threshold.ordinal();
    }

    private String getReportSubject(ReportDTO report) {
        String period = DATE_FORMAT.format(report.periodEnd());
        return switch (report.type()) {
            case "DAILY" -> "[AIIM] Daily Briefing - " + period;
            case "WEEKLY" -> "[AIIM] Weekly Intelligence Report - " + period;
            case "INCIDENT" -> "[AIIM] Incident Report: " + report.title();
            default -> "[AIIM] " + report.title();
        };
    }

    private String getAlertSubject(ThreatAlert alert) {
        String severity = alert.getSeverity().name();
        return String.format("[AIIM %s ALERT] %s", severity, alert.getTitle());
    }

    private String buildReportPlainText(ReportDTO report) {
        StringBuilder sb = new StringBuilder();
        sb.append(report.title()).append("\n");
        sb.append("=".repeat(50)).append("\n\n");

        sb.append("Generated: ").append(DATETIME_FORMAT.format(report.generatedAt())).append(" (Yerevan)\n");
        sb.append("Period: ").append(DATE_FORMAT.format(report.periodStart()))
          .append(" - ").append(DATE_FORMAT.format(report.periodEnd())).append("\n\n");

        sb.append("SUMMARY\n");
        sb.append("-".repeat(30)).append("\n");
        sb.append("Articles Analyzed: ").append(report.summary().totalArticles()).append("\n");
        sb.append("Active Narratives: ").append(report.summary().totalNarratives()).append("\n");
        sb.append("Alerts Triggered: ").append(report.summary().totalAlerts()).append("\n");
        sb.append("High-Threat Narratives: ").append(report.summary().highThreatNarratives()).append("\n");
        sb.append("Overall Threat Level: ").append(report.summary().overallThreatLevel()).append("\n\n");

        sb.append("View full report: ").append(baseUrl).append("/reports\n\n");
        sb.append("--\n");
        sb.append("AIIM - AI Information Integrity Monitor\n");

        return sb.toString();
    }

    private String buildReportHtml(ReportDTO report, User user) {
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f1f5f9;">
                <table width="100%%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <tr>
                        <td>
                            <!-- Header -->
                            <table width="100%%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1a2332 0%%, #2d3b50 100%%); border-radius: 12px 12px 0 0; padding: 24px;">
                                <tr>
                                    <td style="color: white;">
                                        <h1 style="margin: 0; font-size: 24px; font-weight: 600;">%s</h1>
                                        <p style="margin: 8px 0 0; opacity: 0.8; font-size: 14px;">%s - %s</p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Content -->
                            <table width="100%%" cellpadding="0" cellspacing="0" style="background: white; padding: 24px;">
                                <tr>
                                    <td>
                                        <p style="color: #475569; margin: 0 0 20px;">Hello %s,</p>
                                        <p style="color: #475569; margin: 0 0 24px;">Here's your %s summary from AIIM.</p>

                                        <!-- Stats Grid -->
                                        <table width="100%%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                                            <tr>
                                                <td width="50%%" style="padding: 0 8px 8px 0;">
                                                    <div style="background: #f8fafc; border-radius: 8px; padding: 16px; text-align: center;">
                                                        <div style="font-size: 28px; font-weight: 700; color: #1e293b;">%d</div>
                                                        <div style="font-size: 12px; color: #64748b; text-transform: uppercase;">Articles</div>
                                                    </div>
                                                </td>
                                                <td width="50%%" style="padding: 0 0 8px 8px;">
                                                    <div style="background: #f8fafc; border-radius: 8px; padding: 16px; text-align: center;">
                                                        <div style="font-size: 28px; font-weight: 700; color: #1e293b;">%d</div>
                                                        <div style="font-size: 12px; color: #64748b; text-transform: uppercase;">Narratives</div>
                                                    </div>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td width="50%%" style="padding: 8px 8px 0 0;">
                                                    <div style="background: #f8fafc; border-radius: 8px; padding: 16px; text-align: center;">
                                                        <div style="font-size: 28px; font-weight: 700; color: #1e293b;">%d</div>
                                                        <div style="font-size: 12px; color: #64748b; text-transform: uppercase;">Alerts</div>
                                                    </div>
                                                </td>
                                                <td width="50%%" style="padding: 8px 0 0 8px;">
                                                    <div style="background: %s; border-radius: 8px; padding: 16px; text-align: center;">
                                                        <div style="font-size: 18px; font-weight: 700; color: %s;">%s</div>
                                                        <div style="font-size: 12px; color: %s; text-transform: uppercase;">Threat Level</div>
                                                    </div>
                                                </td>
                                            </tr>
                                        </table>

                                        <!-- CTA Button -->
                                        <table width="100%%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td align="center" style="padding: 16px 0;">
                                                    <a href="%s/reports" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600;">View Full Report</a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Footer -->
                            <table width="100%%" cellpadding="0" cellspacing="0" style="background: #f8fafc; border-radius: 0 0 12px 12px; padding: 20px;">
                                <tr>
                                    <td style="text-align: center; color: #64748b; font-size: 12px;">
                                        <p style="margin: 0 0 8px;">AIIM - AI Information Integrity Monitor</p>
                                        <p style="margin: 0;">
                                            <a href="%s/settings" style="color: #64748b;">Manage notification preferences</a>
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
            """.formatted(
                report.title(),
                DATE_FORMAT.format(report.periodStart()),
                DATE_FORMAT.format(report.periodEnd()),
                user.getName() != null ? user.getName() : "there",
                report.type().toLowerCase(),
                report.summary().totalArticles(),
                report.summary().totalNarratives(),
                report.summary().totalAlerts(),
                getThreatBgColor(report.summary().overallThreatLevel()),
                getThreatTextColor(report.summary().overallThreatLevel()),
                report.summary().overallThreatLevel(),
                getThreatTextColor(report.summary().overallThreatLevel()),
                baseUrl,
                baseUrl
            );
    }

    private String buildAlertPlainText(ThreatAlert alert) {
        StringBuilder sb = new StringBuilder();
        sb.append("[").append(alert.getSeverity().name()).append(" ALERT] ").append(alert.getTitle()).append("\n");
        sb.append("=".repeat(50)).append("\n\n");

        sb.append("Triggered: ").append(DATETIME_FORMAT.format(alert.getTriggeredAt())).append(" (Yerevan)\n");
        sb.append("Type: ").append(alert.getAlertType().name().replace("_", " ")).append("\n\n");

        sb.append("Description:\n");
        sb.append(alert.getDescription()).append("\n\n");

        if (alert.getNarrative() != null) {
            sb.append("Related Narrative: ").append(alert.getNarrative().getName()).append("\n\n");
        }

        sb.append("View in dashboard: ").append(baseUrl).append("/alerts?id=").append(alert.getId()).append("\n\n");
        sb.append("--\n");
        sb.append("AIIM - AI Information Integrity Monitor\n");

        return sb.toString();
    }

    private String buildAlertHtml(ThreatAlert alert, User user) {
        String severityColor = getSeverityColor(alert.getSeverity().name());
        String severityBg = getSeverityBgColor(alert.getSeverity().name());

        return """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f1f5f9;">
                <table width="100%%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <tr>
                        <td>
                            <!-- Header -->
                            <table width="100%%" cellpadding="0" cellspacing="0" style="background: %s; border-radius: 12px 12px 0 0; padding: 24px;">
                                <tr>
                                    <td>
                                        <div style="display: inline-block; background: white; color: %s; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 4px; margin-bottom: 12px;">
                                            %s ALERT
                                        </div>
                                        <h1 style="margin: 0; font-size: 22px; font-weight: 600; color: white;">%s</h1>
                                        <p style="margin: 8px 0 0; color: rgba(255,255,255,0.8); font-size: 14px;">Triggered at %s (Yerevan)</p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Content -->
                            <table width="100%%" cellpadding="0" cellspacing="0" style="background: white; padding: 24px;">
                                <tr>
                                    <td>
                                        <p style="color: #475569; margin: 0 0 16px;">Hello %s,</p>
                                        <p style="color: #475569; margin: 0 0 20px;">A new %s-severity alert has been triggered in AIIM.</p>

                                        <!-- Alert Details -->
                                        <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                                            <p style="margin: 0 0 12px; font-weight: 600; color: #1e293b;">Alert Details</p>
                                            <p style="margin: 0 0 8px; color: #475569;"><strong>Type:</strong> %s</p>
                                            %s
                                            <p style="margin: 16px 0 0; color: #475569;">%s</p>
                                        </div>

                                        <!-- CTA Button -->
                                        <table width="100%%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td align="center" style="padding: 16px 0;">
                                                    <a href="%s/alerts?id=%d" style="display: inline-block; background: %s; color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600;">View Alert Details</a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Footer -->
                            <table width="100%%" cellpadding="0" cellspacing="0" style="background: #f8fafc; border-radius: 0 0 12px 12px; padding: 20px;">
                                <tr>
                                    <td style="text-align: center; color: #64748b; font-size: 12px;">
                                        <p style="margin: 0 0 8px;">AIIM - AI Information Integrity Monitor</p>
                                        <p style="margin: 0;">
                                            <a href="%s/settings" style="color: #64748b;">Manage notification preferences</a>
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
            """.formatted(
                severityBg,
                severityColor,
                alert.getSeverity().name(),
                alert.getTitle(),
                DATETIME_FORMAT.format(alert.getTriggeredAt()),
                user.getName() != null ? user.getName() : "there",
                alert.getSeverity().name().toLowerCase(),
                alert.getAlertType().name().replace("_", " "),
                alert.getNarrative() != null
                    ? "<p style=\"margin: 0 0 8px; color: #475569;\"><strong>Related Narrative:</strong> " + alert.getNarrative().getName() + "</p>"
                    : "",
                alert.getDescription(),
                baseUrl,
                alert.getId(),
                severityColor,
                baseUrl
            );
    }

    private String getThreatBgColor(String level) {
        return switch (level) {
            case "CRITICAL" -> "#fce7f3";
            case "HIGH" -> "#fee2e2";
            case "MEDIUM" -> "#fef3c7";
            default -> "#dcfce7";
        };
    }

    private String getThreatTextColor(String level) {
        return switch (level) {
            case "CRITICAL" -> "#9d174d";
            case "HIGH" -> "#dc2626";
            case "MEDIUM" -> "#d97706";
            default -> "#16a34a";
        };
    }

    private String getSeverityColor(String severity) {
        return switch (severity) {
            case "CRITICAL" -> "#9333ea";
            case "HIGH" -> "#dc2626";
            case "MEDIUM" -> "#d97706";
            default -> "#2563eb";
        };
    }

    private String getSeverityBgColor(String severity) {
        return switch (severity) {
            case "CRITICAL" -> "linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)";
            case "HIGH" -> "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)";
            case "MEDIUM" -> "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)";
            default -> "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)";
        };
    }
}
