package com.newssentiment.dto;

import com.newssentiment.model.Organization;

import java.time.Instant;

public record OrganizationDTO(
        Long id,
        String name,
        String slug,
        String description,
        String tier,
        Boolean active,
        Integer maxUsers,
        Integer maxSources,
        Integer maxNarratives,
        Integer currentUsers,
        Instant createdAt
) {
    public static OrganizationDTO fromEntity(Organization org, int currentUsers) {
        return new OrganizationDTO(
                org.getId(),
                org.getName(),
                org.getSlug(),
                org.getDescription(),
                org.getTier().name(),
                org.getActive(),
                org.getMaxUsers(),
                org.getMaxSources(),
                org.getMaxNarratives(),
                currentUsers,
                org.getCreatedAt()
        );
    }

    public static OrganizationDTO fromEntity(Organization org) {
        return fromEntity(org, 0);
    }
}
