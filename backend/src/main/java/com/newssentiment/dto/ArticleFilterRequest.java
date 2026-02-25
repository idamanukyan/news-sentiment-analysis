package com.newssentiment.dto;

import com.newssentiment.model.SentimentResult;
import com.newssentiment.model.Source;

import java.time.Instant;
import java.util.List;

public record ArticleFilterRequest(
        Long sourceId,
        List<Long> sourceIds,
        Long topicId,
        Long narrativeId,
        SentimentResult.Sentiment sentiment,
        Source.Language language,
        Source.SourceType sourceType,
        Instant from,
        Instant to,
        String query,
        Boolean searchContent
) {
    // Backwards compatible constructor
    public ArticleFilterRequest(
            Long sourceId,
            Long topicId,
            SentimentResult.Sentiment sentiment,
            Instant from,
            Instant to,
            String query
    ) {
        this(sourceId, null, topicId, null, sentiment, null, null, from, to, query, false);
    }
}
