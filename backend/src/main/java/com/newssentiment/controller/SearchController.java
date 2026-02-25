package com.newssentiment.controller;

import com.newssentiment.model.Article;
import com.newssentiment.model.Narrative;
import com.newssentiment.model.ThreatAlert;
import com.newssentiment.repository.ArticleRepository;
import com.newssentiment.repository.NarrativeRepository;
import com.newssentiment.repository.ThreatAlertRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/search")
@RequiredArgsConstructor
public class SearchController {

    private final ArticleRepository articleRepository;
    private final NarrativeRepository narrativeRepository;
    private final ThreatAlertRepository threatAlertRepository;

    @GetMapping
    public ResponseEntity<Map<String, Object>> globalSearch(@RequestParam String q) {
        if (q == null || q.trim().length() < 2) {
            return ResponseEntity.ok(Map.of(
                "articles", List.of(),
                "narratives", List.of(),
                "alerts", List.of(),
                "totalCount", 0
            ));
        }

        String searchTerm = q.trim();

        // Search narratives (limit 5) - database-level search
        List<Map<String, Object>> narratives = narrativeRepository
            .searchByNameOrDescriptionList(searchTerm, PageRequest.of(0, 5))
            .stream()
            .map(this::mapNarrative)
            .collect(Collectors.toList());

        // Search alerts (limit 5) - database-level search
        List<Map<String, Object>> alerts = threatAlertRepository
            .searchByTitleOrDescription(searchTerm, PageRequest.of(0, 5))
            .stream()
            .map(this::mapAlert)
            .collect(Collectors.toList());

        // Search articles (limit 10) - database-level search
        List<Map<String, Object>> articles = articleRepository
            .searchByTitleOrContent(searchTerm, PageRequest.of(0, 10))
            .stream()
            .map(this::mapArticle)
            .collect(Collectors.toList());

        int totalCount = narratives.size() + alerts.size() + articles.size();

        return ResponseEntity.ok(Map.of(
            "articles", articles,
            "narratives", narratives,
            "alerts", alerts,
            "totalCount", totalCount
        ));
    }

    private Map<String, Object> mapNarrative(Narrative n) {
        Map<String, Object> result = new HashMap<>();
        result.put("type", "narrative");
        result.put("id", n.getId());
        result.put("title", n.getName());
        result.put("subtitle", truncate(n.getDescription(), 100));
        result.put("metadata", Map.of(
            "threatLevel", n.getThreatLevel() != null ? n.getThreatLevel().name() : "LOW",
            "status", n.getStatus() != null ? n.getStatus().name() : "MONITORING"
        ));
        return result;
    }

    private Map<String, Object> mapAlert(ThreatAlert a) {
        Map<String, Object> result = new HashMap<>();
        result.put("type", "alert");
        result.put("id", a.getId());
        result.put("title", a.getTitle());
        result.put("subtitle", truncate(a.getDescription(), 100));
        result.put("metadata", Map.of(
            "severity", a.getSeverity() != null ? a.getSeverity().name() : "LOW",
            "status", a.getStatus() != null ? a.getStatus().name() : "ACTIVE"
        ));
        return result;
    }

    private Map<String, Object> mapArticle(Article a) {
        Map<String, Object> result = new HashMap<>();
        result.put("type", "article");
        result.put("id", a.getId());
        result.put("title", a.getTitle());
        result.put("subtitle", truncate(a.getContent(), 100));

        String sentiment = "NEUTRAL";
        if (a.getSentimentResult() != null && a.getSentimentResult().getSentiment() != null) {
            sentiment = a.getSentimentResult().getSentiment().name();
        }

        result.put("metadata", Map.of(
            "sentiment", sentiment,
            "sourceName", a.getSource() != null ? a.getSource().getName() : "Unknown"
        ));
        return result;
    }

    private String truncate(String text, int maxLength) {
        if (text == null) return null;
        if (text.length() <= maxLength) return text;
        return text.substring(0, maxLength) + "...";
    }
}
