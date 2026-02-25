package com.newssentiment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record OrganizationCreateRequest(
        @NotBlank @Size(max = 255) String name,
        @NotBlank @Size(max = 50) @Pattern(regexp = "^[a-z0-9-]+$") String slug,
        String description,
        String tier  // FREE, STANDARD, ENTERPRISE
) {}
