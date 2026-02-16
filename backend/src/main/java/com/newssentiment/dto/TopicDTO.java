package com.newssentiment.dto;

import com.newssentiment.model.Topic;

import java.time.Instant;
import java.util.List;

public record TopicDTO(
        Long id,
        String name,
        List<String> keywords,
        List<Long> sourceIds,
        Boolean globalSearch,
        String language,
        Integer searchIntervalMinutes,
        Instant lastSearchedAt,
        Instant createdAt
) {
    public static TopicDTO fromEntity(Topic topic) {
        return new TopicDTO(
                topic.getId(),
                topic.getName(),
                topic.getKeywords(),
                topic.getSourceIds(),
                topic.getGlobalSearch(),
                topic.getLanguage(),
                topic.getSearchIntervalMinutes(),
                topic.getLastSearchedAt(),
                topic.getCreatedAt()
        );
    }
}
