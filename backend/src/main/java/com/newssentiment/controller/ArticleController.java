package com.newssentiment.controller;

import com.newssentiment.dto.ArticleDTO;
import com.newssentiment.dto.ArticleFilterRequest;
import com.newssentiment.model.SentimentResult;
import com.newssentiment.model.Source;
import com.newssentiment.service.ArticleService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/v1/articles")
@RequiredArgsConstructor
public class ArticleController {

    private final ArticleService articleService;

    @GetMapping
    public ResponseEntity<Page<ArticleDTO>> getArticles(
            @RequestParam(required = false) Long sourceId,
            @RequestParam(required = false) List<Long> sourceIds,
            @RequestParam(required = false) Long topicId,
            @RequestParam(required = false) Long narrativeId,
            @RequestParam(required = false) String sentiment,
            @RequestParam(required = false) String language,
            @RequestParam(required = false) String sourceType,
            @RequestParam(required = false) Instant from,
            @RequestParam(required = false) Instant to,
            @RequestParam(required = false) String q,
            @RequestParam(required = false, defaultValue = "false") Boolean searchContent,
            @PageableDefault(size = 20, sort = "publishedAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        ArticleFilterRequest filter = new ArticleFilterRequest(
                sourceId,
                sourceIds,
                topicId,
                narrativeId,
                sentiment != null ? SentimentResult.Sentiment.valueOf(sentiment.toUpperCase()) : null,
                language != null ? Source.Language.valueOf(language.toUpperCase()) : null,
                sourceType != null ? Source.SourceType.valueOf(sourceType.toUpperCase()) : null,
                from,
                to,
                q,
                searchContent
        );

        return ResponseEntity.ok(articleService.findWithFilters(filter, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ArticleDTO> getArticle(@PathVariable Long id) {
        return articleService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
