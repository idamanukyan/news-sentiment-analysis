package com.newssentiment.repository;

import com.newssentiment.model.SentimentResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface SentimentResultRepository extends JpaRepository<SentimentResult, Long> {

    Optional<SentimentResult> findByArticleId(Long articleId);

    @Query("SELECT sr.sentiment, COUNT(sr) FROM SentimentResult sr " +
           "WHERE sr.processedAt BETWEEN :from AND :to " +
           "GROUP BY sr.sentiment")
    List<Object[]> countBySentimentBetween(
            @Param("from") Instant from,
            @Param("to") Instant to);

    @Query("SELECT sr.article.source.id, sr.sentiment, COUNT(sr) FROM SentimentResult sr " +
           "WHERE sr.processedAt BETWEEN :from AND :to " +
           "GROUP BY sr.article.source.id, sr.sentiment")
    List<Object[]> countBySourceAndSentimentBetween(
            @Param("from") Instant from,
            @Param("to") Instant to);

    @Query("SELECT FUNCTION('DATE', sr.processedAt), sr.sentiment, COUNT(sr) FROM SentimentResult sr " +
           "WHERE sr.processedAt BETWEEN :from AND :to " +
           "GROUP BY FUNCTION('DATE', sr.processedAt), sr.sentiment " +
           "ORDER BY FUNCTION('DATE', sr.processedAt)")
    List<Object[]> countByDayAndSentimentBetween(
            @Param("from") Instant from,
            @Param("to") Instant to);
}
