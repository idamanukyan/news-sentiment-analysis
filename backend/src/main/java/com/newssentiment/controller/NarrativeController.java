package com.newssentiment.controller;

import com.newssentiment.dto.ArticleDTO;
import com.newssentiment.dto.NarrativeApproveRequest;
import com.newssentiment.dto.NarrativeCreateRequest;
import com.newssentiment.dto.NarrativeDTO;
import com.newssentiment.model.Article;
import com.newssentiment.model.Narrative.NarrativeStatus;
import com.newssentiment.model.Narrative.ThreatLevel;
import com.newssentiment.repository.ArticleRepository;
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

    @GetMapping
    public ResponseEntity<Page<NarrativeDTO>> getAllNarratives(
            @RequestParam(required = false) String status,
            @PageableDefault(size = 20) Pageable pageable) {

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

        NarrativeDTO narrative = narrativeOpt.get();
        List<String> keywords = narrative.keywords();
        if (keywords == null || keywords.isEmpty()) {
            return ResponseEntity.ok(Page.empty(pageable));
        }

        Instant since = Instant.now().minus(30, ChronoUnit.DAYS);
        String[] keywordArray = keywords.toArray(new String[0]);

        List<Article> articles = articleRepository.findByKeywordsSince(
                keywordArray, since, pageable);

        List<ArticleDTO> dtos = articles.stream()
                .map(this::toArticleDTO)
                .toList();

        return ResponseEntity.ok(new PageImpl<>(dtos, pageable, dtos.size()));
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
}
