package com.newssentiment.service;

import com.newssentiment.model.Article;
import com.newssentiment.model.ThreatAlert;
import com.newssentiment.repository.ArticleRepository;
import com.newssentiment.repository.ThreatAlertRepository;
import com.newssentiment.security.OrganizationContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Service for exporting data to Excel format.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ExcelExportService {

    private final ArticleRepository articleRepository;
    private final ThreatAlertRepository alertRepository;

    private static final DateTimeFormatter DATE_FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm").withZone(ZoneId.systemDefault());

    /**
     * Export recent articles to Excel.
     */
    @Transactional(readOnly = true)
    public byte[] exportArticles(int days, int maxRows) throws IOException {
        Instant since = Instant.now().minus(days, ChronoUnit.DAYS);

        List<Article> articles = articleRepository.findByPublishedAtBetween(
                        since, Instant.now(), PageRequest.of(0, maxRows))
                .getContent();

        try (Workbook workbook = new XSSFWorkbook()) {
            // Create styles
            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle dateStyle = createDateStyle(workbook);

            // Articles sheet
            Sheet articlesSheet = workbook.createSheet("Articles");
            createArticlesSheet(articlesSheet, articles, headerStyle, dateStyle);

            // Summary sheet
            Sheet summarySheet = workbook.createSheet("Summary");
            createSummarySheet(summarySheet, articles, headerStyle);

            // Auto-size columns
            for (int i = 0; i < 8; i++) {
                articlesSheet.autoSizeColumn(i);
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        }
    }

    /**
     * Export alerts to Excel.
     */
    @Transactional(readOnly = true)
    public byte[] exportAlerts(int days) throws IOException {
        Instant since = Instant.now().minus(days, ChronoUnit.DAYS);
        Long orgId = OrganizationContext.getCurrentOrganizationIdOrNull();

        List<ThreatAlert> alerts = orgId != null
                ? alertRepository.findByOrganizationIdAndTriggeredSince(orgId, since)
                : alertRepository.findTriggeredSince(since);

        try (Workbook workbook = new XSSFWorkbook()) {
            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle dateStyle = createDateStyle(workbook);

            Sheet alertsSheet = workbook.createSheet("Alerts");
            createAlertsSheet(alertsSheet, alerts, headerStyle, dateStyle);

            // Auto-size columns
            for (int i = 0; i < 10; i++) {
                alertsSheet.autoSizeColumn(i);
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        }
    }

    private void createArticlesSheet(Sheet sheet, List<Article> articles,
                                     CellStyle headerStyle, CellStyle dateStyle) {
        // Header row
        Row headerRow = sheet.createRow(0);
        String[] headers = {"ID", "Title", "Source", "Source Type", "Language",
                "Published At", "Sentiment", "URL"};

        for (int i = 0; i < headers.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(headerStyle);
        }

        // Data rows
        int rowNum = 1;
        for (Article article : articles) {
            Row row = sheet.createRow(rowNum++);

            row.createCell(0).setCellValue(article.getId());
            row.createCell(1).setCellValue(truncate(article.getTitle(), 100));
            row.createCell(2).setCellValue(article.getSource() != null ?
                    article.getSource().getName() : "");
            row.createCell(3).setCellValue(article.getSource() != null ?
                    article.getSource().getType().name() : "");
            row.createCell(4).setCellValue(article.getSource() != null ?
                    article.getSource().getLanguage().name() : "");

            Cell dateCell = row.createCell(5);
            if (article.getPublishedAt() != null) {
                dateCell.setCellValue(DATE_FORMATTER.format(article.getPublishedAt()));
            }
            dateCell.setCellStyle(dateStyle);

            row.createCell(6).setCellValue(article.getSentimentResult() != null ?
                    article.getSentimentResult().getSentiment().name() : "PENDING");
            row.createCell(7).setCellValue(truncate(article.getUrl(), 100));
        }
    }

    private void createAlertsSheet(Sheet sheet, List<ThreatAlert> alerts,
                                   CellStyle headerStyle, CellStyle dateStyle) {
        Row headerRow = sheet.createRow(0);
        String[] headers = {"ID", "Title", "Type", "Severity", "Status",
                "Narrative", "Triggered At", "Occurrences", "Assigned To", "Priority"};

        for (int i = 0; i < headers.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(headerStyle);
        }

        int rowNum = 1;
        for (ThreatAlert alert : alerts) {
            Row row = sheet.createRow(rowNum++);

            row.createCell(0).setCellValue(alert.getId());
            row.createCell(1).setCellValue(truncate(alert.getTitle(), 80));
            row.createCell(2).setCellValue(alert.getAlertType().name());
            row.createCell(3).setCellValue(alert.getSeverity().name());
            row.createCell(4).setCellValue(alert.getStatus().name());
            row.createCell(5).setCellValue(alert.getNarrative() != null ?
                    alert.getNarrative().getName() : "");

            Cell dateCell = row.createCell(6);
            if (alert.getTriggeredAt() != null) {
                dateCell.setCellValue(DATE_FORMATTER.format(alert.getTriggeredAt()));
            }
            dateCell.setCellStyle(dateStyle);

            row.createCell(7).setCellValue(alert.getOccurrenceCount() != null ?
                    alert.getOccurrenceCount() : 1);
            row.createCell(8).setCellValue(alert.getAssignedTo() != null ?
                    alert.getAssignedTo() : "");
            row.createCell(9).setCellValue(getPriorityLabel(alert.getPriority()));
        }
    }

    private void createSummarySheet(Sheet sheet, List<Article> articles, CellStyle headerStyle) {
        Row headerRow = sheet.createRow(0);
        Cell headerCell = headerRow.createCell(0);
        headerCell.setCellValue("Export Summary");
        headerCell.setCellStyle(headerStyle);

        sheet.createRow(2).createCell(0).setCellValue("Total Articles:");
        sheet.getRow(2).createCell(1).setCellValue(articles.size());

        // Count by source type
        long rssCount = articles.stream()
                .filter(a -> a.getSource() != null && a.getSource().getType().name().equals("RSS"))
                .count();
        long telegramCount = articles.stream()
                .filter(a -> a.getSource() != null && a.getSource().getType().name().equals("TELEGRAM"))
                .count();

        sheet.createRow(4).createCell(0).setCellValue("RSS Articles:");
        sheet.getRow(4).createCell(1).setCellValue(rssCount);

        sheet.createRow(5).createCell(0).setCellValue("Telegram Posts:");
        sheet.getRow(5).createCell(1).setCellValue(telegramCount);

        // Sentiment breakdown
        long positive = articles.stream()
                .filter(a -> a.getSentimentResult() != null &&
                        "POSITIVE".equals(a.getSentimentResult().getSentiment().name()))
                .count();
        long negative = articles.stream()
                .filter(a -> a.getSentimentResult() != null &&
                        "NEGATIVE".equals(a.getSentimentResult().getSentiment().name()))
                .count();
        long neutral = articles.stream()
                .filter(a -> a.getSentimentResult() != null &&
                        "NEUTRAL".equals(a.getSentimentResult().getSentiment().name()))
                .count();

        sheet.createRow(7).createCell(0).setCellValue("Sentiment Distribution:");
        sheet.createRow(8).createCell(0).setCellValue("  Positive:");
        sheet.getRow(8).createCell(1).setCellValue(positive);
        sheet.createRow(9).createCell(0).setCellValue("  Neutral:");
        sheet.getRow(9).createCell(1).setCellValue(neutral);
        sheet.createRow(10).createCell(0).setCellValue("  Negative:");
        sheet.getRow(10).createCell(1).setCellValue(negative);

        sheet.createRow(12).createCell(0).setCellValue("Generated At:");
        sheet.getRow(12).createCell(1).setCellValue(DATE_FORMATTER.format(Instant.now()));
    }

    private CellStyle createHeaderStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        return style;
    }

    private CellStyle createDateStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        style.setDataFormat(workbook.createDataFormat().getFormat("yyyy-mm-dd hh:mm"));
        return style;
    }

    private String truncate(String text, int maxLength) {
        if (text == null) return "";
        return text.length() > maxLength ? text.substring(0, maxLength) + "..." : text;
    }

    private String getPriorityLabel(Integer priority) {
        if (priority == null || priority == 0) return "Normal";
        if (priority == 1) return "High";
        if (priority >= 2) return "Urgent";
        return "Normal";
    }
}
