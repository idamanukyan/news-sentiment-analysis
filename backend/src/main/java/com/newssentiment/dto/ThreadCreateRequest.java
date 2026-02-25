package com.newssentiment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ThreadCreateRequest(
        @NotBlank @Size(max = 255) String title,
        @NotBlank String content,
        String discussionType, // GENERAL, NARRATIVE, ALERT
        Long narrativeId,
        Long alertId
) {
    public ThreadCreateRequest {
        if (discussionType == null) {
            discussionType = "GENERAL";
        }
    }
}
