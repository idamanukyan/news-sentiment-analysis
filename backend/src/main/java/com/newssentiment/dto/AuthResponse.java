package com.newssentiment.dto;

public record AuthResponse(
        String token,
        long expiresIn,
        String email,
        String name,
        String role,
        Long organizationId,
        String organizationName,
        String organizationSlug
) {}
