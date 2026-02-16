package com.newssentiment.dto;

public record AuthResponse(
        String token,
        long expiresIn
) {}
