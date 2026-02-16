package com.newssentiment.dto;

import com.newssentiment.model.SentimentResult;

import java.time.Instant;

public record ArticleFilterRequest(
        Long sourceId,
        SentimentResult.Sentiment sentiment,
        Instant from,
        Instant to,
        String query
) {}
