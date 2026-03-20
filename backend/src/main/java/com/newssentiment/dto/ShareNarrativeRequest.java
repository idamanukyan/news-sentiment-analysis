package com.newssentiment.dto;

import java.util.List;

public record ShareNarrativeRequest(
    List<Long> userIds,
    boolean canEdit
) {}
