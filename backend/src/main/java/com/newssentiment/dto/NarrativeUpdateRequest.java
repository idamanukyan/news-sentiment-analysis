package com.newssentiment.dto;

import java.util.List;

public record NarrativeUpdateRequest(
        String name,
        String description,
        List<String> keywords,
        String threatLevel
) {}
