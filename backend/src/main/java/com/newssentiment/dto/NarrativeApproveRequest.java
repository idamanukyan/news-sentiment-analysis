package com.newssentiment.dto;

/**
 * Request body for approving a pending narrative.
 * The title field is optional - if provided, it will update the narrative's name.
 */
public record NarrativeApproveRequest(
        String title
) {}
