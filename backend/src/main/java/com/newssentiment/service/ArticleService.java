package com.newssentiment.service;

import com.newssentiment.dto.ArticleDTO;
import com.newssentiment.dto.ArticleFilterRequest;
import com.newssentiment.model.Article;
import com.newssentiment.repository.ArticleRepository;
import com.newssentiment.repository.ArticleSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ArticleService {

    private final ArticleRepository articleRepository;

    @Transactional(readOnly = true)
    public Page<ArticleDTO> findWithFilters(ArticleFilterRequest filter, Pageable pageable) {
        // Use JPA Specification for flexible filtering with null handling
        Page<Article> articles = articleRepository.findAll(
                ArticleSpecification.withFilters(filter),
                pageable
        );
        return articles.map(this::toDTO);
    }

    @Transactional(readOnly = true)
    public Optional<ArticleDTO> findById(Long id) {
        return articleRepository.findById(id).map(this::toDTO);
    }

    @Transactional
    public Article save(Article article) {
        if (article.getContent() != null) {
            article.setContentHash(computeHash(article.getContent()));
        }
        return articleRepository.save(article);
    }

    public boolean existsByContentHash(String contentHash) {
        return articleRepository.existsByContentHash(contentHash);
    }

    public Optional<Article> findBySourceIdAndExternalId(Long sourceId, String externalId) {
        return articleRepository.findBySourceIdAndExternalId(sourceId, externalId);
    }

    private String computeHash(String content) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(content.getBytes());
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }

    public ArticleDTO toDTO(Article article) {
        // Original content snippet
        String snippet = null;
        if (article.getContent() != null) {
            snippet = article.getContent().length() > 200
                    ? article.getContent().substring(0, 200) + "..."
                    : article.getContent();
        }

        // English content snippet (if available)
        String snippetEn = null;
        if (article.getContentEn() != null) {
            snippetEn = article.getContentEn().length() > 200
                    ? article.getContentEn().substring(0, 200) + "..."
                    : article.getContentEn();
        }

        return new ArticleDTO(
                article.getId(),
                article.getSource() != null ? article.getSource().getId() : null,
                article.getSource() != null ? article.getSource().getName() : "Global News",
                article.getSource() != null && article.getSource().getType() != null ? article.getSource().getType().name() : null,
                article.getSource() != null && article.getSource().getLanguage() != null ? article.getSource().getLanguage().name() : null,
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
}
