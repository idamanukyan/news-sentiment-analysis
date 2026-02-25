package com.newssentiment.dto;

import com.newssentiment.model.User;

import java.time.Instant;

public record UserDTO(
        Long id,
        String email,
        String name,
        String role,
        Long organizationId,
        String organizationName,
        Boolean enabled,
        Instant createdAt,
        Instant lastLogin
) {
    public static UserDTO fromEntity(User user) {
        return new UserDTO(
                user.getId(),
                user.getEmail(),
                user.getName(),
                user.getRole().name(),
                user.getOrganizationId(),
                user.getOrganization() != null ? user.getOrganization().getName() : null,
                user.getEnabled(),
                user.getCreatedAt(),
                user.getLastLogin()
        );
    }
}
