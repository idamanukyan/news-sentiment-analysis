package com.newssentiment.service;

import com.newssentiment.dto.ArticleDTO;
import com.newssentiment.dto.ArticleFilterRequest;
import com.newssentiment.model.Article;
import com.newssentiment.repository.ArticleRepository;
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
        Page<Article> articles = articleRepository.findWithFilters(
                filter.sourceId(),
                filter.sentiment(),
                filter.from(),
                filter.to(),
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

    private ArticleDTO toDTO(Article article) {
        return new ArticleDTO(
                article.getId(),
                article.getSource().getId(),
                article.getSource().getName(),
                article.getTitle(),
                article.getUrl(),
                article.getAuthor(),
                article.getPublishedAt(),
                article.getSentimentResult() != null ? article.getSentimentResult().getSentiment().name() : null,
                article.getSentimentResult() != null ? article.getSentimentResult().getConfidence() : null
        );
    }
}
