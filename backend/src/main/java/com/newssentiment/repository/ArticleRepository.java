package com.newssentiment.repository;

import com.newssentiment.model.Article;
import com.newssentiment.model.SentimentResult;
import com.newssentiment.model.Source;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface ArticleRepository extends JpaRepository<Article, Long>, JpaSpecificationExecutor<Article> {

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
           "AND (:topicId IS NULL OR a.topic.id = :topicId) " +
           "AND (:sentiment IS NULL OR sr.sentiment = :sentiment) " +
           "AND (:from IS NULL OR a.publishedAt >= :from) " +
           "AND (:to IS NULL OR a.publishedAt <= :to)")
    Page<Article> findWithFilters(
            @Param("sourceId") Long sourceId,
            @Param("topicId") Long topicId,
            @Param("sentiment") SentimentResult.Sentiment sentiment,
            @Param("from") Instant from,
            @Param("to") Instant to,
            Pageable pageable);

    @Query("SELECT a FROM Article a " +
           "LEFT JOIN FETCH a.sentimentResult sr " +
           "WHERE (:sourceId IS NULL OR a.source.id = :sourceId) " +
           "AND (:topicId IS NULL OR a.topic.id = :topicId) " +
           "AND (:sentiment IS NULL OR sr.sentiment = :sentiment) " +
           "AND (:from IS NULL OR a.publishedAt >= :from) " +
           "AND (:to IS NULL OR a.publishedAt <= :to) " +
           "AND LOWER(a.title) LIKE LOWER(CONCAT('%', :query, '%'))")
    Page<Article> findWithFiltersAndSearch(
            @Param("sourceId") Long sourceId,
            @Param("topicId") Long topicId,
            @Param("sentiment") SentimentResult.Sentiment sentiment,
            @Param("from") Instant from,
            @Param("to") Instant to,
            @Param("query") String query,
            Pageable pageable);

    @Query("SELECT a FROM Article a " +
           "LEFT JOIN a.sentimentResult sr " +
           "LEFT JOIN a.source s " +
           "WHERE (:sourceId IS NULL OR a.source.id = :sourceId) " +
           "AND (:sourceIds IS NULL OR a.source.id IN :sourceIds) " +
           "AND (:topicId IS NULL OR a.topic.id = :topicId) " +
           "AND (:sentiment IS NULL OR sr.sentiment = :sentiment) " +
           "AND (:language IS NULL OR s.language = :language) " +
           "AND (:sourceType IS NULL OR s.type = :sourceType) " +
           "AND (:from IS NULL OR a.publishedAt >= :from) " +
           "AND (:to IS NULL OR a.publishedAt <= :to)")
    Page<Article> findWithAdvancedFilters(
            @Param("sourceId") Long sourceId,
            @Param("sourceIds") List<Long> sourceIds,
            @Param("topicId") Long topicId,
            @Param("sentiment") SentimentResult.Sentiment sentiment,
            @Param("language") Source.Language language,
            @Param("sourceType") Source.SourceType sourceType,
            @Param("from") Instant from,
            @Param("to") Instant to,
            Pageable pageable);

    @Query("SELECT a FROM Article a " +
           "LEFT JOIN a.sentimentResult sr " +
           "LEFT JOIN a.source s " +
           "WHERE (:sourceId IS NULL OR a.source.id = :sourceId) " +
           "AND (:sourceIds IS NULL OR a.source.id IN :sourceIds) " +
           "AND (:topicId IS NULL OR a.topic.id = :topicId) " +
           "AND (:sentiment IS NULL OR sr.sentiment = :sentiment) " +
           "AND (:language IS NULL OR s.language = :language) " +
           "AND (:sourceType IS NULL OR s.type = :sourceType) " +
           "AND (:from IS NULL OR a.publishedAt >= :from) " +
           "AND (:to IS NULL OR a.publishedAt <= :to) " +
           "AND ((:searchContent = false AND LOWER(a.title) LIKE LOWER(CONCAT('%', :query, '%'))) OR " +
           "     (:searchContent = true AND (LOWER(a.title) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(a.content) LIKE LOWER(CONCAT('%', :query, '%')))))")
    Page<Article> findWithAdvancedFiltersAndSearch(
            @Param("sourceId") Long sourceId,
            @Param("sourceIds") List<Long> sourceIds,
            @Param("topicId") Long topicId,
            @Param("sentiment") SentimentResult.Sentiment sentiment,
            @Param("language") Source.Language language,
            @Param("sourceType") Source.SourceType sourceType,
            @Param("from") Instant from,
            @Param("to") Instant to,
            @Param("query") String query,
            @Param("searchContent") Boolean searchContent,
            Pageable pageable);

    @Query("SELECT a FROM Article a WHERE a.sentimentResult IS NULL")
    List<Article> findUnprocessedArticles(Pageable pageable);

    @Query("SELECT COUNT(a) FROM Article a WHERE a.source.id = :sourceId AND a.publishedAt >= :since")
    long countBySourceIdSince(@Param("sourceId") Long sourceId, @Param("since") Instant since);

    @Query("SELECT COUNT(a) FROM Article a WHERE a.publishedAt >= :since")
    long countSince(@Param("since") Instant since);

    @Query("SELECT COUNT(a) FROM Article a " +
           "LEFT JOIN a.sentimentResult sr " +
           "WHERE sr.sentiment = :sentiment AND a.publishedAt >= :since")
    long countBySentimentSince(@Param("sentiment") SentimentResult.Sentiment sentiment, @Param("since") Instant since);

    long countByCreatedAtAfter(Instant since);

    Optional<Article> findTopByOrderByCreatedAtDesc();

    // Narrative keyword matching - count articles containing any of the keywords
    // Searches both original and English text for reliable matching
    @Query(value = "SELECT COUNT(*) FROM articles a " +
           "WHERE a.published_at >= :since " +
           "AND (LOWER(a.title) LIKE ANY(ARRAY(SELECT '%' || LOWER(k) || '%' FROM UNNEST(:keywords) k)) " +
           "OR LOWER(a.content) LIKE ANY(ARRAY(SELECT '%' || LOWER(k) || '%' FROM UNNEST(:keywords) k)) " +
           "OR LOWER(COALESCE(a.title_en, '')) LIKE ANY(ARRAY(SELECT '%' || LOWER(k) || '%' FROM UNNEST(:keywords) k)) " +
           "OR LOWER(COALESCE(a.content_en, '')) LIKE ANY(ARRAY(SELECT '%' || LOWER(k) || '%' FROM UNNEST(:keywords) k)))",
           nativeQuery = true)
    long countByKeywordsSince(@Param("keywords") String[] keywords, @Param("since") Instant since);

    // Get articles matching keywords for a narrative
    // Searches both original and English text for reliable matching
    @Query(value = "SELECT * FROM articles a " +
           "WHERE a.published_at >= :since " +
           "AND (LOWER(a.title) LIKE ANY(ARRAY(SELECT '%' || LOWER(k) || '%' FROM UNNEST(:keywords) k)) " +
           "OR LOWER(a.content) LIKE ANY(ARRAY(SELECT '%' || LOWER(k) || '%' FROM UNNEST(:keywords) k)) " +
           "OR LOWER(COALESCE(a.title_en, '')) LIKE ANY(ARRAY(SELECT '%' || LOWER(k) || '%' FROM UNNEST(:keywords) k)) " +
           "OR LOWER(COALESCE(a.content_en, '')) LIKE ANY(ARRAY(SELECT '%' || LOWER(k) || '%' FROM UNNEST(:keywords) k))) " +
           "ORDER BY a.published_at DESC",
           nativeQuery = true)
    List<Article> findByKeywordsSince(@Param("keywords") String[] keywords, @Param("since") Instant since, Pageable pageable);

    // Count articles by source type
    @Query("SELECT s.type, COUNT(a) FROM Article a JOIN a.source s GROUP BY s.type")
    List<Object[]> countBySourceType();

    // Daily article counts for the last N days (for volume chart)
    @Query(value = "SELECT DATE(a.published_at) as date, COUNT(*) as count " +
           "FROM articles a " +
           "WHERE a.published_at >= :since " +
           "GROUP BY DATE(a.published_at) " +
           "ORDER BY date",
           nativeQuery = true)
    List<Object[]> countByDaySince(@Param("since") Instant since);

    // Count Telegram posts specifically (source type = TELEGRAM)
    @Query("SELECT COUNT(a) FROM Article a JOIN a.source s WHERE s.type = 'TELEGRAM'")
    long countTelegramPosts();

    // Count articles published after a certain time
    long countByPublishedAtAfter(Instant since);

    // Count articles by source type since a certain time
    @Query("SELECT COUNT(a) FROM Article a JOIN a.source s WHERE s.type = :sourceType AND a.publishedAt >= :since")
    long countBySourceTypeSince(@Param("sourceType") String sourceType, @Param("since") Instant since);

    // Simple search for global search endpoint
    @Query("SELECT a FROM Article a WHERE " +
           "LOWER(a.title) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(a.content) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "ORDER BY a.publishedAt DESC")
    List<Article> searchByTitleOrContent(@Param("query") String query, Pageable pageable);

    // Organization-scoped queries (articles are scoped via source.organizationId)
    @Query("SELECT COUNT(a) FROM Article a JOIN a.source s WHERE s.organizationId = :orgId")
    long countByOrganizationId(@Param("orgId") Long orgId);

    @Query("SELECT COUNT(a) FROM Article a JOIN a.source s WHERE s.organizationId = :orgId AND a.publishedAt BETWEEN :from AND :to")
    long countByOrganizationIdAndPublishedAtBetween(@Param("orgId") Long orgId, @Param("from") Instant from, @Param("to") Instant to);

    @Query("SELECT COUNT(a) FROM Article a JOIN a.source s WHERE s.organizationId = :orgId AND s.type = 'TELEGRAM'")
    long countTelegramPostsByOrganizationId(@Param("orgId") Long orgId);

    @Query("SELECT s.type, COUNT(a) FROM Article a JOIN a.source s WHERE s.organizationId = :orgId GROUP BY s.type")
    List<Object[]> countBySourceTypeAndOrganizationId(@Param("orgId") Long orgId);

    @Query(value = "SELECT DATE(a.published_at) as date, COUNT(*) as count " +
           "FROM articles a " +
           "JOIN sources s ON a.source_id = s.id " +
           "WHERE s.organization_id = :orgId AND a.published_at >= :since " +
           "GROUP BY DATE(a.published_at) " +
           "ORDER BY date",
           nativeQuery = true)
    List<Object[]> countByDaySinceAndOrganizationId(@Param("orgId") Long orgId, @Param("since") Instant since);
}
