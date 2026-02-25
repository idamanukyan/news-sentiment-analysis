package com.newssentiment.dto;

import com.newssentiment.model.FactCheck;

import java.time.Instant;

public record FactCheckDTO(
        Long id,
        Long narrativeId,
        String narrativeName,
        String title,
        String url,
        String publisher,
        String verdict,
        Instant publishedAt,
        Instant addedAt,
        String addedBy,
        String notes
) {
    public static FactCheckDTO fromEntity(FactCheck fc) {
        return new FactCheckDTO(
                fc.getId(),
                fc.getNarrative() != null ? fc.getNarrative().getId() : null,
                fc.getNarrative() != null ? fc.getNarrative().getName() : null,
                fc.getTitle(),
                fc.getUrl(),
                fc.getPublisher(),
                fc.getVerdict() != null ? fc.getVerdict().name() : null,
                fc.getPublishedAt(),
                fc.getAddedAt(),
                fc.getAddedBy(),
                fc.getNotes()
        );
    }
}
