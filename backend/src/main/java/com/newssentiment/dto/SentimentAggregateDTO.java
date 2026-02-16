package com.newssentiment.dto;

public record SentimentAggregateDTO(
        String group,
        Long positive,
        Long negative,
        Long neutral,
        Long total
) {}
