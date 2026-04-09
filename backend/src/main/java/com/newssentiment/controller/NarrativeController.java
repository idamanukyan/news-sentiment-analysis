package com.newssentiment.controller;

import com.newssentiment.dto.ArticleDTO;
import com.newssentiment.dto.NarrativeApproveRequest;
import com.newssentiment.dto.NarrativeCreateRequest;
import com.newssentiment.dto.NarrativeDTO;
import com.newssentiment.dto.NarrativeUpdateRequest;
import com.newssentiment.dto.ShareNarrativeRequest;
import com.newssentiment.dto.SharedUserDTO;
import com.newssentiment.model.Article;
import com.newssentiment.model.Narrative.NarrativeStatus;
import com.newssentiment.model.Narrative.ThreatLevel;
import com.newssentiment.repository.ArticleRepository;
import com.newssentiment.service.NarrativeRelevanceService;
import com.newssentiment.service.NarrativeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/api/v1/narratives")
@RequiredArgsConstructor
public class NarrativeController {

    private final NarrativeService narrativeService;
    private final ArticleRepository articleRepository;
    private final NarrativeRelevanceService narrativeRelevanceService;

    @GetMapping
    public ResponseEntity<Page<NarrativeDTO>> getAllNarratives(
            @RequestParam(required = false) String status,
            @RequestParam(required = false, defaultValue = "all") String filter,
            @PageableDefault(size = 20) Pageable pageable) {

        // Handle filter parameter: "mine", "shared", or "all"
        if ("mine".equalsIgnoreCase(filter)) {
            return ResponseEntity.ok(narrativeService.findMyNarratives(pageable));
        } else if ("shared".equalsIgnoreCase(filter)) {
            return ResponseEntity.ok(narrativeService.findSharedWithMe(pageable));
        }

        if (status != null) {
            List<NarrativeStatus> statuses = Arrays.stream(status.split(","))
                    .map(s -> NarrativeStatus.valueOf(s.toUpperCase().trim()))
                    .toList();
            return ResponseEntity.ok(narrativeService.findByStatuses(statuses, pageable));
        }

        return ResponseEntity.ok(narrativeService.findAll(pageable));
    }

    @GetMapping("/active")
    public ResponseEntity<List<NarrativeDTO>> getActiveNarratives() {
        return ResponseEntity.ok(narrativeService.findActive());
    }

    @GetMapping("/top")
    public ResponseEntity<List<NarrativeDTO>> getTopNarratives(
            @RequestParam(defaultValue = "5") int limit) {
        return ResponseEntity.ok(narrativeService.findTopByArticleCount(limit));
    }

    @GetMapping("/{id}")
    public ResponseEntity<NarrativeDTO> getNarrative(@PathVariable Long id) {
        return narrativeService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ORG_ADMIN', 'ANALYST')")
    public ResponseEntity<NarrativeDTO> createNarrative(
            @Valid @RequestBody NarrativeCreateRequest request) {
        NarrativeDTO created = narrativeService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ORG_ADMIN', 'ANALYST')")
    public ResponseEntity<NarrativeDTO> updateNarrative(
            @PathVariable Long id,
            @RequestBody NarrativeUpdateRequest request) {
        return narrativeService.update(id, request.name(), request.description(),
                        request.keywords(), request.threatLevel())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ORG_ADMIN', 'ANALYST')")
    public ResponseEntity<NarrativeDTO> updateStatus(
            @PathVariable Long id,
            @RequestParam String status) {
        return narrativeService.updateStatus(id, NarrativeStatus.valueOf(status.toUpperCase()))
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/threat-level")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ORG_ADMIN', 'ANALYST')")
    public ResponseEntity<NarrativeDTO> updateThreatLevel(
            @PathVariable Long id,
            @RequestParam String level) {
        return narrativeService.updateThreatLevel(id, ThreatLevel.valueOf(level.toUpperCase()))
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Approve a pending narrative, changing its status from PENDING_REVIEW to ACTIVE.
     * Optionally accepts a new title in the request body.
     * Returns 409 Conflict if the narrative is not in PENDING_REVIEW status (unless already ACTIVE).
     */
    @PatchMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ORG_ADMIN', 'ANALYST')")
    public ResponseEntity<?> approveNarrative(
            @PathVariable Long id,
            @RequestBody(required = false) NarrativeApproveRequest request) {
        try {
            String newTitle = request != null ? request.title() : null;
            return narrativeService.approve(id, newTitle)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
        }
    }

    /**
     * Get narratives pending review.
     */
    @GetMapping("/pending")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ORG_ADMIN', 'ANALYST')")
    public ResponseEntity<Page<NarrativeDTO>> getPendingNarratives(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(narrativeService.findPendingReview(pageable));
    }

    /**
     * Get count of narratives pending review.
     */
    @GetMapping("/pending-count")
    public ResponseEntity<java.util.Map<String, Long>> getPendingCount() {
        return ResponseEntity.ok(java.util.Map.of("count", narrativeService.countPendingReview()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<Void> deleteNarrative(@PathVariable Long id) {
        narrativeService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/detect")
    public ResponseEntity<List<Long>> detectNarratives(
            @RequestParam String title,
            @RequestParam(required = false, defaultValue = "") String content) {
        return ResponseEntity.ok(narrativeService.detectNarratives(title, content));
    }

    @GetMapping("/{id}/articles")
    @Transactional(readOnly = true)
    public ResponseEntity<Page<ArticleDTO>> getNarrativeArticles(
            @PathVariable Long id,
            @PageableDefault(size = 50) Pageable pageable) {

        var narrativeOpt = narrativeService.findById(id);
        if (narrativeOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Float relevanceThreshold = narrativeRelevanceService.getRelevanceThreshold();

        // Articles are linked to narratives via the article_narratives junction table.
        // The junction is populated by the scraper's LLM clustering and refined by
        // NarrativeRelevanceService. We deliberately do NOT fall back to a raw keyword
        // search: a narrative's keywords describe the topic in broad terms and a LIKE
        // search returns many articles that do not actually belong to the narrative.
        long junctionCount = articleRepository.countByNarrativeIdWithRelevanceThreshold(
                id, relevanceThreshold);

        if (junctionCount == 0) {
            return ResponseEntity.ok(Page.empty(pageable));
        }

        List<Article> articles = articleRepository.findByNarrativeIdWithRelevanceThreshold(
                id, relevanceThreshold, pageable);

        List<ArticleDTO> dtos = articles.stream()
                .map(this::toArticleDTO)
                .toList();

        return ResponseEntity.ok(new PageImpl<>(dtos, pageable, junctionCount));
    }

    private ArticleDTO toArticleDTO(Article article) {
        String snippet = truncate(article.getContent(), 500);
        String snippetEn = truncate(article.getContentEn(), 500);

        return new ArticleDTO(
                article.getId(),
                article.getSource() != null ? article.getSource().getId() : null,
                article.getSource() != null ? article.getSource().getName() : null,
                article.getSource() != null ? article.getSource().getType().name() : null,
                article.getSource() != null ? article.getSource().getLanguage().name() : null,
                article.getTopic() != null ? article.getTopic().getId() : null,
                article.getTopic() != null ? article.getTopic().getName() : null,
                article.getNarrative() != null ? article.getNarrative().getId() : null,
                article.getNarrative() != null ? article.getNarrative().getName() : null,
                article.getTitle(),
                article.getTitleEn(),
                snippet,
                snippetEn,
                article.getDetectedLanguage(),
                article.getLlmTopic(),
                article.getLlmKeywords() != null ? java.util.Arrays.asList(article.getLlmKeywords()) : null,
                article.getUrl(),
                article.getAuthor(),
                article.getPublishedAt(),
                article.getSentimentResult() != null ? article.getSentimentResult().getSentiment().name() : null,
                article.getSentimentResult() != null ? article.getSentimentResult().getConfidence() : null
        );
    }

    private String truncate(String text, int maxLength) {
        if (text == null || text.isEmpty()) {
            return null;
        }
        if (text.length() <= maxLength) {
            return text;
        }
        return text.substring(0, maxLength);
    }

    // ==================== Sharing Endpoints ====================

    /**
     * Share a narrative with specified users.
     */
    @PostMapping("/{id}/share")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ORG_ADMIN', 'ANALYST')")
    public ResponseEntity<?> shareNarrative(
            @PathVariable Long id,
            @Valid @RequestBody ShareNarrativeRequest request) {
        try {
            NarrativeDTO updated = narrativeService.shareNarrative(id, request.userIds(), request.canEdit());
            return ResponseEntity.ok(updated);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Remove sharing of a narrative with a specific user.
     */
    @DeleteMapping("/{id}/share/{userId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ORG_ADMIN', 'ANALYST')")
    public ResponseEntity<?> unshareNarrative(
            @PathVariable Long id,
            @PathVariable Long userId) {
        try {
            narrativeService.unshareNarrative(id, userId);
            return ResponseEntity.noContent().build();
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Get users a narrative is shared with.
     */
    @GetMapping("/{id}/shares")
    public ResponseEntity<List<SharedUserDTO>> getShares(@PathVariable Long id) {
        return ResponseEntity.ok(narrativeService.getSharedUsers(id));
    }

    // ==================== Admin Endpoints ====================

    /**
     * Get counts of auto-generated narratives by status.
     * Useful for diagnosing why Pending Review tab might be empty.
     */
    @GetMapping("/admin/status-counts")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<java.util.Map<String, Object>> getAutoGeneratedStatusCounts() {
        java.util.Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("autoGeneratedByStatus", narrativeService.getAutoGeneratedStatusCounts());
        return ResponseEntity.ok(result);
    }

    /**
     * Reset all auto-generated narratives (that were previously approved) back to PENDING_REVIEW.
     * This allows analysts to re-review AI-generated narratives.
     */
    @PostMapping("/admin/reset-to-pending")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<java.util.Map<String, Object>> resetAutoGeneratedToPending() {
        int count = narrativeService.resetAutoGeneratedToPending();
        java.util.Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("message", "Reset auto-generated narratives to PENDING_REVIEW");
        result.put("resetCount", count);
        result.put("note", "These narratives will now appear in the Pending Review tab");
        return ResponseEntity.ok(result);
    }

    // ==================== Relevance Scoring Endpoints ====================

    /**
     * Get relevance scoring status.
     */
    @GetMapping("/relevance/status")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<java.util.Map<String, Object>> getRelevanceStatus() {
        java.util.Map<String, Object> status = new java.util.LinkedHashMap<>();
        status.put("unscoredPairs", narrativeRelevanceService.countUnscoredPairs());
        status.put("relevanceThreshold", narrativeRelevanceService.getRelevanceThreshold());
        return ResponseEntity.ok(status);
    }

    /**
     * Reset all relevance scores for re-evaluation.
     * This will trigger a full re-scoring by the scheduled job.
     */
    @PostMapping("/relevance/rescore")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<java.util.Map<String, Object>> rescoreAllNarratives() {
        int resetCount = narrativeRelevanceService.resetAllScores();
        java.util.Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("message", "Relevance scores reset for re-evaluation");
        result.put("resetCount", resetCount);
        result.put("note", "Scores will be re-evaluated by the scheduled job (runs every 6 hours) or can be triggered manually");
        return ResponseEntity.ok(result);
    }

    /**
     * Reset relevance scores for a specific narrative.
     */
    @PostMapping("/{id}/relevance/rescore")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ORG_ADMIN', 'ANALYST')")
    public ResponseEntity<java.util.Map<String, Object>> rescoreNarrative(@PathVariable Long id) {
        var narrativeOpt = narrativeService.findById(id);
        if (narrativeOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        int resetCount = narrativeRelevanceService.resetScoresForNarrative(id);
        java.util.Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("message", "Relevance scores reset for narrative " + id);
        result.put("narrativeId", id);
        result.put("resetCount", resetCount);
        return ResponseEntity.ok(result);
    }

    /**
     * Manually trigger relevance scoring (for testing/admin use).
     */
    @PostMapping("/relevance/process")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<java.util.Map<String, Object>> processRelevanceScoring() {
        int processed = narrativeRelevanceService.processAllUnscored();
        java.util.Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("message", "Relevance scoring completed");
        result.put("processedCount", processed);
        result.put("remainingUnscored", narrativeRelevanceService.countUnscoredPairs());
        return ResponseEntity.ok(result);
    }

    /**
     * Diagnostic endpoint to debug why a narrative shows no articles.
     */
    @GetMapping("/{id}/diagnose")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ORG_ADMIN', 'ANALYST')")
    @Transactional(readOnly = true)
    public ResponseEntity<java.util.Map<String, Object>> diagnoseNarrative(@PathVariable Long id) {
        var narrativeOpt = narrativeService.findById(id);
        if (narrativeOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        NarrativeDTO narrative = narrativeOpt.get();
        java.util.Map<String, Object> diagnosis = new java.util.LinkedHashMap<>();

        diagnosis.put("narrativeId", narrative.id());
        diagnosis.put("name", narrative.name());
        diagnosis.put("status", narrative.status());
        diagnosis.put("originalKeywords", narrative.keywords());
        diagnosis.put("originalKeywordsCount", narrative.keywords() != null ? narrative.keywords().size() : 0);
        diagnosis.put("articleCountStored", narrative.articleCount());

        // Check articles in the last 30 days
        Instant since = Instant.now().minus(30, ChronoUnit.DAYS);
        long totalArticlesLast30Days = articleRepository.countByPublishedAtAfter(since);
        diagnosis.put("totalArticlesLast30Days", totalArticlesLast30Days);

        // If we have keywords, try to find matching articles
        if (narrative.keywords() != null && !narrative.keywords().isEmpty()) {
            // Expand multi-word keywords
            List<String> expandedKeywords = new java.util.ArrayList<>();
            for (String keyword : narrative.keywords()) {
                expandedKeywords.add(keyword);
                if (keyword.contains(" ")) {
                    for (String word : keyword.split("\\s+")) {
                        if (word.length() >= 3 && !expandedKeywords.contains(word)) {
                            expandedKeywords.add(word);
                        }
                    }
                }
            }
            diagnosis.put("expandedKeywords", expandedKeywords);
            diagnosis.put("expandedKeywordsCount", expandedKeywords.size());

            String[] keywordArray = expandedKeywords.toArray(new String[0]);
            List<Article> matchingArticles = articleRepository.findByKeywordsSince(
                    keywordArray, since, Pageable.ofSize(10));
            diagnosis.put("matchingArticlesFound", matchingArticles.size());

            // Show first few matching titles and their English titles for debugging
            List<java.util.Map<String, String>> sampleArticles = matchingArticles.stream()
                    .limit(5)
                    .map(a -> {
                        java.util.Map<String, String> info = new java.util.LinkedHashMap<>();
                        info.put("title", truncate(a.getTitle(), 100));
                        info.put("titleEn", truncate(a.getTitleEn(), 100));
                        info.put("hasTranslation", a.getTitleEn() != null ? "yes" : "no");
                        return info;
                    })
                    .toList();
            diagnosis.put("sampleMatchingArticles", sampleArticles);

            if (matchingArticles.isEmpty()) {
                diagnosis.put("possibleIssues", Arrays.asList(
                    "Keywords may be too specific (multi-word phrases need exact match)",
                    "Articles may not be translated yet (title_en is NULL)",
                    "Try adding Armenian keywords to match original content",
                    "Try single-word keywords like 'Syunik', 'territorial', 'Pashinyan'"
                ));
            }
        } else {
            diagnosis.put("issue", "NO_KEYWORDS - Narrative has no keywords defined");
        }

        return ResponseEntity.ok(diagnosis);
    }
}
