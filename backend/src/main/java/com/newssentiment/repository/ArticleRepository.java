package com.newssentiment.repository;

import com.newssentiment.model.Article;
import com.newssentiment.model.SentimentResult;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface ArticleRepository extends JpaRepository<Article, Long> {

    Optional<Article> findBySourceIdAndExternalId(Long sourceId, String externalId);

    boolean existsByContentHash(String contentHash);

    Page<Article> findBySourceId(Long sourceId, Pageable pageable);

    @Query("SELECT a FROM Article a WHERE a.publishedAt BETWEEN :from AND :to")
    Page<Article> findByPublishedAtBetween(
            @Param("from") Instant from,
            @Param("to") Instant to,
            Pageable pageable);

    @Query("SELECT a FROM Article a " +
           "LEFT JOIN FETCH a.sentimentResult sr " +
           "WHERE (:sourceId IS NULL OR a.source.id = :sourceId) " +
           "AND (:sentiment IS NULL OR sr.sentiment = :sentiment) " +
           "AND (:from IS NULL OR a.publishedAt >= :from) " +
           "AND (:to IS NULL OR a.publishedAt <= :to)")
    Page<Article> findWithFilters(
            @Param("sourceId") Long sourceId,
            @Param("sentiment") SentimentResult.Sentiment sentiment,
            @Param("from") Instant from,
            @Param("to") Instant to,
            Pageable pageable);

    @Query("SELECT a FROM Article a WHERE a.sentimentResult IS NULL")
    List<Article> findUnprocessedArticles(Pageable pageable);

    @Query("SELECT COUNT(a) FROM Article a WHERE a.source.id = :sourceId AND a.publishedAt >= :since")
    long countBySourceIdSince(@Param("sourceId") Long sourceId, @Param("since") Instant since);
}
