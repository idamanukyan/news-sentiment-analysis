package com.newssentiment.repository;

import com.newssentiment.dto.ArticleFilterRequest;
import com.newssentiment.model.Article;
import com.newssentiment.model.SentimentResult;
import com.newssentiment.model.Source;
import jakarta.persistence.criteria.*;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public class ArticleSpecification {

    /**
     * Build specification with organization filtering.
     * Articles are filtered by their source's organizationId.
     */
    public static Specification<Article> withFiltersAndOrganization(ArticleFilterRequest filter, Long organizationId) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Join with sentiment result
            Join<Article, SentimentResult> sentimentJoin = root.join("sentimentResult", JoinType.LEFT);

            // Join with source (INNER join for org filtering)
            Join<Article, Source> sourceJoin = root.join("source", JoinType.INNER);

            // Organization filter - articles must belong to sources in this org
            predicates.add(cb.equal(sourceJoin.get("organizationId"), organizationId));

            // Apply common filters
            addCommonFilters(filter, root, sourceJoin, sentimentJoin, cb, predicates);

            // Make distinct to handle joins
            query.distinct(true);

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    /**
     * Legacy method without organization filtering (for system/internal use).
     */
    public static Specification<Article> withFilters(ArticleFilterRequest filter) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Join with sentiment result
            Join<Article, SentimentResult> sentimentJoin = root.join("sentimentResult", JoinType.LEFT);

            // Join with source
            Join<Article, Source> sourceJoin = root.join("source", JoinType.LEFT);

            // Apply common filters
            addCommonFilters(filter, root, sourceJoin, sentimentJoin, cb, predicates);

            // Make distinct to handle joins
            query.distinct(true);

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private static void addCommonFilters(
            ArticleFilterRequest filter,
            Root<Article> root,
            Join<Article, Source> sourceJoin,
            Join<Article, SentimentResult> sentimentJoin,
            CriteriaBuilder cb,
            List<Predicate> predicates) {

            // Source ID filter
            if (filter.sourceId() != null) {
                predicates.add(cb.equal(root.get("source").get("id"), filter.sourceId()));
            }

            // Source IDs filter
            if (filter.sourceIds() != null && !filter.sourceIds().isEmpty()) {
                predicates.add(root.get("source").get("id").in(filter.sourceIds()));
            }

            // Topic ID filter
            if (filter.topicId() != null) {
                predicates.add(cb.equal(root.get("topic").get("id"), filter.topicId()));
            }

            // Sentiment filter
            if (filter.sentiment() != null) {
                predicates.add(cb.equal(sentimentJoin.get("sentiment"), filter.sentiment()));
            }

            // Language filter
            if (filter.language() != null) {
                predicates.add(cb.equal(sourceJoin.get("language"), filter.language()));
            }

            // Source type filter
            if (filter.sourceType() != null) {
                predicates.add(cb.equal(sourceJoin.get("type"), filter.sourceType()));
            }

            // Date range filters
            if (filter.from() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("publishedAt"), filter.from()));
            }

            if (filter.to() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("publishedAt"), filter.to()));
            }

        // Search query - search both original and English text for better matching
        if (filter.query() != null && !filter.query().isBlank()) {
            String searchPattern = "%" + filter.query().toLowerCase() + "%";

            // Search original title
            Predicate titleSearch = cb.like(cb.lower(root.get("title")), searchPattern);
            // Search English title (if available)
            Predicate titleEnSearch = cb.like(cb.lower(root.get("titleEn")), searchPattern);

            if (Boolean.TRUE.equals(filter.searchContent())) {
                // Search original content
                Predicate contentSearch = cb.like(cb.lower(root.get("content")), searchPattern);
                // Search English content (if available)
                Predicate contentEnSearch = cb.like(cb.lower(root.get("contentEn")), searchPattern);
                predicates.add(cb.or(titleSearch, titleEnSearch, contentSearch, contentEnSearch));
            } else {
                predicates.add(cb.or(titleSearch, titleEnSearch));
            }
        }
    }
}
