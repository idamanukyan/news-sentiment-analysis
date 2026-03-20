package com.newssentiment.dto;

import java.time.Instant;

public record SharedUserDTO(
    Long userId,
    String userName,
    String userEmail,
    boolean canEdit,
    Instant sharedAt
) {}
