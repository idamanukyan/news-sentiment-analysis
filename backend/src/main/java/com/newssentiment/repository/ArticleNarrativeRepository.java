package com.newssentiment.repository;

import com.newssentiment.model.ArticleNarrative;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ArticleNarrativeRepository extends JpaRepository<ArticleNarrative, ArticleNarrative.ArticleNarrativeId> {

    /**
     * Find article-narrative pairs that haven't been scored yet.
     */
    @Query("SELECT an FROM ArticleNarrative an " +
           "JOIN FETCH an.article a " +
           "JOIN FETCH an.narrative n " +
           "WHERE an.relevanceScore IS NULL")
    List<ArticleNarrative> findUnscoredPairs(Pageable pageable);

    /**
     * Count unscored pairs.
     */
    @Query("SELECT COUNT(an) FROM ArticleNarrative an WHERE an.relevanceScore IS NULL")
    long countUnscoredPairs();

    /**
     * Find pairs for a specific narrative that pass the relevance threshold.
     */
    @Query("SELECT an FROM ArticleNarrative an " +
           "WHERE an.narrativeId = :narrativeId " +
           "AND (an.relevanceScore IS NULL OR an.relevanceScore >= :threshold)")
    List<ArticleNarrative> findByNarrativeIdAndRelevanceScoreAboveThreshold(
            @Param("narrativeId") Long narrativeId,
            @Param("threshold") Float threshold);

    /**
     * Find article IDs for a narrative that pass the relevance threshold.
     */
    @Query("SELECT an.articleId FROM ArticleNarrative an " +
           "WHERE an.narrativeId = :narrativeId " +
           "AND (an.relevanceScore IS NULL OR an.relevanceScore >= :threshold)")
    List<Long> findArticleIdsByNarrativeIdAndRelevanceScoreAboveThreshold(
            @Param("narrativeId") Long narrativeId,
            @Param("threshold") Float threshold);

    /**
     * Reset all relevance scores to NULL for re-evaluation.
     */
    @Modifying
    @Query("UPDATE ArticleNarrative an SET an.relevanceScore = NULL")
    int resetAllRelevanceScores();

    /**
     * Reset relevance scores for a specific narrative.
     */
    @Modifying
    @Query("UPDATE ArticleNarrative an SET an.relevanceScore = NULL WHERE an.narrativeId = :narrativeId")
    int resetRelevanceScoresByNarrativeId(@Param("narrativeId") Long narrativeId);

    /**
     * Update relevance score for a specific article-narrative pair.
     */
    @Modifying
    @Query("UPDATE ArticleNarrative an SET an.relevanceScore = :score " +
           "WHERE an.articleId = :articleId AND an.narrativeId = :narrativeId")
    int updateRelevanceScore(
            @Param("articleId") Long articleId,
            @Param("narrativeId") Long narrativeId,
            @Param("score") Float score);

    /**
     * Count pairs by narrative ID.
     */
    long countByNarrativeId(Long narrativeId);

    /**
     * Count pairs above threshold for a narrative.
     */
    @Query("SELECT COUNT(an) FROM ArticleNarrative an " +
           "WHERE an.narrativeId = :narrativeId " +
           "AND (an.relevanceScore IS NULL OR an.relevanceScore >= :threshold)")
    long countByNarrativeIdAboveThreshold(
            @Param("narrativeId") Long narrativeId,
            @Param("threshold") Float threshold);

    /**
     * Link articles to a narrative by keyword matching.
     *
     * Used for user-created narratives (the scraper only links its own
     * auto-clustered narratives). Inserts pairs with relevance_score=NULL so
     * NarrativeRelevanceService can refine them via Claude on its next run.
     * Searches both original and English text. Idempotent via ON CONFLICT.
     */
    @Modifying
    @Query(value = "INSERT INTO article_narratives (article_id, narrative_id, confidence, detected_at, relevance_score) " +
           "SELECT a.id, :narrativeId, 0.7, NOW(), NULL FROM articles a " +
           "WHERE a.published_at >= :since " +
           "AND (LOWER(a.title) LIKE ANY(ARRAY(SELECT '%' || LOWER(k) || '%' FROM UNNEST(CAST(:keywords AS TEXT[])) k)) " +
           "  OR LOWER(a.content) LIKE ANY(ARRAY(SELECT '%' || LOWER(k) || '%' FROM UNNEST(CAST(:keywords AS TEXT[])) k)) " +
           "  OR LOWER(COALESCE(a.title_en, '')) LIKE ANY(ARRAY(SELECT '%' || LOWER(k) || '%' FROM UNNEST(CAST(:keywords AS TEXT[])) k)) " +
           "  OR LOWER(COALESCE(a.content_en, '')) LIKE ANY(ARRAY(SELECT '%' || LOWER(k) || '%' FROM UNNEST(CAST(:keywords AS TEXT[])) k))) " +
           "ON CONFLICT (article_id, narrative_id) DO NOTHING",
           nativeQuery = true)
    int linkArticlesToNarrativeByKeywords(
            @Param("narrativeId") Long narrativeId,
            @Param("keywords") String[] keywords,
            @Param("since") java.time.Instant since);
}
