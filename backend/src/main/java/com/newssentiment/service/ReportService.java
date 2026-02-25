package com.newssentiment.service;

import com.newssentiment.dto.NarrativeDTO;
import com.newssentiment.dto.ReportDTO;
import com.newssentiment.dto.ThreatAlertDTO;
import com.newssentiment.model.Narrative;
import com.newssentiment.model.ThreatAlert;
import com.newssentiment.repository.ArticleRepository;
import com.newssentiment.repository.NarrativeRepository;
import com.newssentiment.repository.ThreatAlertRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.PrintWriter;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportService {

    private final ArticleRepository articleRepository;
    private final NarrativeRepository narrativeRepository;
    private final ThreatAlertRepository alertRepository;
    private final NarrativeService narrativeService;
    private final ThreatAlertService alertService;
    private final SentimentService sentimentService;

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter
            .ofPattern("yyyy-MM-dd HH:mm")
            .withZone(ZoneId.of("UTC"));

    @Transactional(readOnly = true)
    public ReportDTO generateWeeklyReport() {
        Instant now = Instant.now();
        Instant weekAgo = now.minus(7, ChronoUnit.DAYS);
        return generateReport("Weekly Briefing", "WEEKLY", weekAgo, now);
    }

    @Transactional(readOnly = true)
    public ReportDTO generateDailyReport() {
        Instant now = Instant.now();
        Instant dayAgo = now.minus(24, ChronoUnit.HOURS);
        return generateReport("Daily Summary", "DAILY", dayAgo, now);
    }

    @Transactional(readOnly = true)
    public ReportDTO generateIncidentReport(Long narrativeId) {
        Narrative narrative = narrativeRepository.findById(narrativeId)
                .orElseThrow(() -> new RuntimeException("Narrative not found: " + narrativeId));

        Instant now = Instant.now();
        Instant start = narrative.getFirstSeen() != null ? narrative.getFirstSeen() : now.minus(30, ChronoUnit.DAYS);

        List<ThreatAlertDTO> relatedAlerts = alertRepository.findByNarrativeId(narrativeId)
                .stream()
                .map(this::toAlertDTO)
                .toList();

        ReportDTO.ReportSummary summary = new ReportDTO.ReportSummary(
                narrative.getArticleCount(),
                1L,
                relatedAlerts.size(),
                narrative.getThreatLevel() == Narrative.ThreatLevel.HIGH ||
                        narrative.getThreatLevel() == Narrative.ThreatLevel.CRITICAL ? 1L : 0L,
                narrative.getThreatLevel().name(),
                Map.of(),
                Map.of()
        );

        return new ReportDTO(
                "Incident Report: " + narrative.getName(),
                "INCIDENT",
                now,
                start,
                now,
                summary,
                List.of(narrativeService.findById(narrativeId).orElse(null)),
                relatedAlerts,
                Map.of("narrativeId", narrativeId)
        );
    }

    @Transactional(readOnly = true)
    public ReportDTO generateReport(String title, String type, Instant start, Instant end) {
        // Get narratives
        List<NarrativeDTO> narratives = narrativeService.findActive();

        // Get alerts in period
        List<ThreatAlertDTO> alerts = alertRepository.findTriggeredSince(start)
                .stream()
                .map(this::toAlertDTO)
                .toList();

        // Calculate stats
        long totalArticles = articleRepository.count();
        long highThreatCount = narratives.stream()
                .filter(n -> "HIGH".equals(n.threatLevel()) || "CRITICAL".equals(n.threatLevel()))
                .count();

        String overallThreat = narrativeService.getOverallThreatLevel().name();

        Map<String, Long> sentimentDist = sentimentService.getOverallCounts(start, end);

        Map<String, Long> sourceDist = new LinkedHashMap<>();
        sourceDist.put("news", totalArticles);
        sourceDist.put("telegram", 0L);

        ReportDTO.ReportSummary summary = new ReportDTO.ReportSummary(
                totalArticles,
                narratives.size(),
                alerts.size(),
                highThreatCount,
                overallThreat,
                sentimentDist,
                sourceDist
        );

        return new ReportDTO(
                title,
                type,
                Instant.now(),
                start,
                end,
                summary,
                narratives,
                alerts,
                Map.of()
        );
    }

    public byte[] exportToCSV(ReportDTO report) {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PrintWriter writer = new PrintWriter(baos);

        // Header
        writer.println("AIIM Report: " + report.title());
        writer.println("Generated: " + DATE_FORMAT.format(report.generatedAt()));
        writer.println("Period: " + DATE_FORMAT.format(report.periodStart()) + " to " + DATE_FORMAT.format(report.periodEnd()));
        writer.println();

        // Summary
        writer.println("=== SUMMARY ===");
        writer.println("Total Articles," + report.summary().totalArticles());
        writer.println("Active Narratives," + report.summary().totalNarratives());
        writer.println("Total Alerts," + report.summary().totalAlerts());
        writer.println("High Threat Narratives," + report.summary().highThreatNarratives());
        writer.println("Overall Threat Level," + report.summary().overallThreatLevel());
        writer.println();

        // Narratives
        writer.println("=== NARRATIVES ===");
        writer.println("Name,Threat Level,Status,Article Count,First Seen");
        for (NarrativeDTO n : report.narratives()) {
            if (n != null) {
                writer.printf("%s,%s,%s,%d,%s%n",
                        escapeCsv(n.name()),
                        n.threatLevel(),
                        n.status(),
                        n.articleCount(),
                        n.firstSeen() != null ? DATE_FORMAT.format(n.firstSeen()) : "N/A"
                );
            }
        }
        writer.println();

        // Alerts
        writer.println("=== ALERTS ===");
        writer.println("Title,Severity,Status,Type,Triggered At,Narrative");
        for (ThreatAlertDTO a : report.alerts()) {
            writer.printf("%s,%s,%s,%s,%s,%s%n",
                    escapeCsv(a.title()),
                    a.severity(),
                    a.status(),
                    a.alertType(),
                    DATE_FORMAT.format(a.triggeredAt()),
                    a.narrativeName() != null ? escapeCsv(a.narrativeName()) : "N/A"
            );
        }

        writer.flush();
        return baos.toByteArray();
    }

    public String exportToMarkdown(ReportDTO report) {
        StringBuilder sb = new StringBuilder();

        // Title
        sb.append("# ").append(report.title()).append("\n\n");
        sb.append("**Generated:** ").append(DATE_FORMAT.format(report.generatedAt())).append(" UTC\n\n");
        sb.append("**Period:** ").append(DATE_FORMAT.format(report.periodStart()))
                .append(" to ").append(DATE_FORMAT.format(report.periodEnd())).append(" UTC\n\n");

        // Summary
        sb.append("## Executive Summary\n\n");
        sb.append("| Metric | Value |\n");
        sb.append("|--------|-------|\n");
        sb.append("| Total Articles Analyzed | ").append(report.summary().totalArticles()).append(" |\n");
        sb.append("| Active Narratives | ").append(report.summary().totalNarratives()).append(" |\n");
        sb.append("| Alerts Triggered | ").append(report.summary().totalAlerts()).append(" |\n");
        sb.append("| High-Threat Narratives | ").append(report.summary().highThreatNarratives()).append(" |\n");
        sb.append("| Overall Threat Level | **").append(report.summary().overallThreatLevel()).append("** |\n\n");

        // Narratives
        sb.append("## Active Narratives\n\n");
        if (report.narratives().isEmpty()) {
            sb.append("_No active narratives_\n\n");
        } else {
            sb.append("| Narrative | Threat Level | Status | Articles |\n");
            sb.append("|-----------|--------------|--------|----------|\n");
            for (NarrativeDTO n : report.narratives()) {
                if (n != null) {
                    sb.append("| ").append(n.name())
                            .append(" | ").append(formatThreatLevel(n.threatLevel()))
                            .append(" | ").append(n.status())
                            .append(" | ").append(n.articleCount())
                            .append(" |\n");
                }
            }
            sb.append("\n");
        }

        // Alerts
        sb.append("## Recent Alerts\n\n");
        if (report.alerts().isEmpty()) {
            sb.append("_No alerts in this period_\n\n");
        } else {
            for (ThreatAlertDTO a : report.alerts()) {
                sb.append("### ").append(formatSeverityEmoji(a.severity())).append(" ").append(a.title()).append("\n\n");
                sb.append("- **Severity:** ").append(a.severity()).append("\n");
                sb.append("- **Status:** ").append(a.status()).append("\n");
                sb.append("- **Type:** ").append(a.alertType().replace("_", " ")).append("\n");
                sb.append("- **Triggered:** ").append(DATE_FORMAT.format(a.triggeredAt())).append(" UTC\n");
                if (a.narrativeName() != null) {
                    sb.append("- **Related Narrative:** ").append(a.narrativeName()).append("\n");
                }
                sb.append("\n").append(a.description()).append("\n\n");
            }
        }

        // Footer
        sb.append("---\n\n");
        sb.append("*Report generated by AIIM - Armenia Information Integrity Monitor*\n");

        return sb.toString();
    }

    private String escapeCsv(String value) {
        if (value == null) return "";
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }

    private String formatThreatLevel(String level) {
        return switch (level) {
            case "CRITICAL" -> "🔴 CRITICAL";
            case "HIGH" -> "🟠 HIGH";
            case "MEDIUM" -> "🟡 MEDIUM";
            default -> "🟢 LOW";
        };
    }

    private String formatSeverityEmoji(String severity) {
        return switch (severity) {
            case "CRITICAL" -> "🚨";
            case "HIGH" -> "⚠️";
            case "MEDIUM" -> "📢";
            default -> "ℹ️";
        };
    }

    private ThreatAlertDTO toAlertDTO(ThreatAlert alert) {
        return new ThreatAlertDTO(
                alert.getId(),
                alert.getNarrative() != null ? alert.getNarrative().getId() : null,
                alert.getNarrative() != null ? alert.getNarrative().getName() : null,
                alert.getAlertType().name(),
                alert.getSeverity().name(),
                alert.getTitle(),
                alert.getDescription(),
                alert.getTriggeredAt(),
                alert.getAcknowledgedAt(),
                alert.getAcknowledgedBy() != null ? alert.getAcknowledgedBy().getName() : null,
                alert.getResolvedAt(),
                alert.getResolvedBy() != null ? alert.getResolvedBy().getName() : null,
                alert.getStatus().name(),
                alert.getMetadata(),
                alert.getCreatedAt(),
                alert.getAssignedTo(),
                alert.getAssignedAt(),
                alert.getPriority(),
                alert.getNotes(),
                alert.getOccurrenceCount(),
                alert.getLastOccurredAt()
        );
    }
}
