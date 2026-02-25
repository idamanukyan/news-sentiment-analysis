package com.newssentiment.controller;

import com.lowagie.text.DocumentException;
import com.newssentiment.dto.ReportDTO;
import com.newssentiment.service.ExcelExportService;
import com.newssentiment.service.PdfExportService;
import com.newssentiment.service.ReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.time.Instant;
import java.time.format.DateTimeFormatter;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
@Tag(name = "Reports", description = "Report generation and export endpoints")
public class ReportController {

    private final ReportService reportService;
    private final PdfExportService pdfExportService;
    private final ExcelExportService excelExportService;

    private static final DateTimeFormatter FILE_DATE_FORMAT = DateTimeFormatter
            .ofPattern("yyyy-MM-dd")
            .withZone(java.time.ZoneId.of("UTC"));

    @GetMapping("/weekly")
    public ResponseEntity<ReportDTO> getWeeklyReport() {
        return ResponseEntity.ok(reportService.generateWeeklyReport());
    }

    @GetMapping("/daily")
    public ResponseEntity<ReportDTO> getDailyReport() {
        return ResponseEntity.ok(reportService.generateDailyReport());
    }

    @GetMapping("/incident/{narrativeId}")
    public ResponseEntity<ReportDTO> getIncidentReport(@PathVariable Long narrativeId) {
        return ResponseEntity.ok(reportService.generateIncidentReport(narrativeId));
    }

    @GetMapping("/weekly/csv")
    public ResponseEntity<byte[]> exportWeeklyCSV() {
        ReportDTO report = reportService.generateWeeklyReport();
        byte[] csv = reportService.exportToCSV(report);

        String filename = "aiim-weekly-" + FILE_DATE_FORMAT.format(Instant.now()) + ".csv";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csv);
    }

    @GetMapping("/daily/csv")
    public ResponseEntity<byte[]> exportDailyCSV() {
        ReportDTO report = reportService.generateDailyReport();
        byte[] csv = reportService.exportToCSV(report);

        String filename = "aiim-daily-" + FILE_DATE_FORMAT.format(Instant.now()) + ".csv";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csv);
    }

    @GetMapping("/weekly/markdown")
    public ResponseEntity<String> exportWeeklyMarkdown() {
        ReportDTO report = reportService.generateWeeklyReport();
        String markdown = reportService.exportToMarkdown(report);

        String filename = "aiim-weekly-" + FILE_DATE_FORMAT.format(Instant.now()) + ".md";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/markdown"))
                .body(markdown);
    }

    @GetMapping("/incident/{narrativeId}/csv")
    public ResponseEntity<byte[]> exportIncidentCSV(@PathVariable Long narrativeId) {
        ReportDTO report = reportService.generateIncidentReport(narrativeId);
        byte[] csv = reportService.exportToCSV(report);

        String filename = "aiim-incident-" + narrativeId + "-" + FILE_DATE_FORMAT.format(Instant.now()) + ".csv";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csv);
    }

    @GetMapping("/incident/{narrativeId}/markdown")
    public ResponseEntity<String> exportIncidentMarkdown(@PathVariable Long narrativeId) {
        ReportDTO report = reportService.generateIncidentReport(narrativeId);
        String markdown = reportService.exportToMarkdown(report);

        String filename = "aiim-incident-" + narrativeId + "-" + FILE_DATE_FORMAT.format(Instant.now()) + ".md";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/markdown"))
                .body(markdown);
    }

    @GetMapping("/types")
    public ResponseEntity<?> getReportTypes() {
        return ResponseEntity.ok(java.util.List.of(
                java.util.Map.of(
                        "id", "weekly",
                        "name", "Weekly Briefing",
                        "description", "Comprehensive weekly summary of narrative activity and alerts",
                        "formats", java.util.List.of("json", "csv", "markdown", "pdf", "excel")
                ),
                java.util.Map.of(
                        "id", "daily",
                        "name", "Daily Summary",
                        "description", "24-hour snapshot of monitoring activity",
                        "formats", java.util.List.of("json", "csv", "markdown")
                ),
                java.util.Map.of(
                        "id", "incident",
                        "name", "Incident Report",
                        "description", "Detailed analysis of a specific narrative",
                        "formats", java.util.List.of("json", "csv", "markdown", "pdf")
                ),
                java.util.Map.of(
                        "id", "eu-dsa",
                        "name", "EU DSA Compliance Report",
                        "description", "Report formatted for EU Digital Services Act compliance",
                        "formats", java.util.List.of("json", "csv")
                )
        ));
    }

    // ===== PDF EXPORT ENDPOINTS =====

    @GetMapping("/weekly/pdf")
    @Operation(summary = "Export weekly report as PDF")
    public ResponseEntity<byte[]> exportWeeklyPdf() throws DocumentException {
        byte[] pdf = pdfExportService.generateWeeklyReport();
        String filename = "aiim-weekly-" + FILE_DATE_FORMAT.format(Instant.now()) + ".pdf";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    @GetMapping("/incident/{narrativeId}/pdf")
    @Operation(summary = "Export incident report as PDF")
    public ResponseEntity<byte[]> exportIncidentPdf(@PathVariable Long narrativeId) throws DocumentException {
        byte[] pdf = pdfExportService.generateNarrativeReport(narrativeId);
        String filename = "aiim-incident-" + narrativeId + "-" + FILE_DATE_FORMAT.format(Instant.now()) + ".pdf";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    // ===== EXCEL EXPORT ENDPOINTS =====

    @GetMapping("/articles/excel")
    @Operation(summary = "Export articles to Excel")
    public ResponseEntity<byte[]> exportArticlesExcel(
            @RequestParam(defaultValue = "7") int days,
            @RequestParam(defaultValue = "1000") int maxRows) throws IOException {

        byte[] excel = excelExportService.exportArticles(days, maxRows);
        String filename = "aiim-articles-" + FILE_DATE_FORMAT.format(Instant.now()) + ".xlsx";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(excel);
    }

    @GetMapping("/alerts/excel")
    @Operation(summary = "Export alerts to Excel")
    public ResponseEntity<byte[]> exportAlertsExcel(
            @RequestParam(defaultValue = "30") int days) throws IOException {

        byte[] excel = excelExportService.exportAlerts(days);
        String filename = "aiim-alerts-" + FILE_DATE_FORMAT.format(Instant.now()) + ".xlsx";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(excel);
    }
}
