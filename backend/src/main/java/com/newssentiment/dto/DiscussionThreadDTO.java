package com.newssentiment.dto;

import com.newssentiment.model.DiscussionThread;

import java.time.Instant;

public record DiscussionThreadDTO(
        Long id,
        String title,
        String content,
        Boolean pinned,
        UserDTO author,
        Integer replyCount,
        String discussionType,
        Long narrativeId,
        String narrativeName,
        Long alertId,
        String alertTitle,
        Instant createdAt,
        Instant updatedAt
) {
    public static DiscussionThreadDTO fromEntity(DiscussionThread thread) {
        return new DiscussionThreadDTO(
                thread.getId(),
                thread.getTitle(),
                thread.getContent(),
                thread.getPinned(),
                UserDTO.fromEntity(thread.getAuthor()),
                thread.getReplies() != null ? thread.getReplies().size() : 0,
                thread.getDiscussionType(),
                thread.getNarrative() != null ? thread.getNarrative().getId() : null,
                thread.getNarrative() != null ? thread.getNarrative().getName() : null,
                thread.getAlert() != null ? thread.getAlert().getId() : null,
                thread.getAlert() != null ? thread.getAlert().getTitle() : null,
                thread.getCreatedAt(),
                thread.getUpdatedAt()
        );
    }

    public static DiscussionThreadDTO fromEntity(DiscussionThread thread, int replyCount) {
        return new DiscussionThreadDTO(
                thread.getId(),
                thread.getTitle(),
                thread.getContent(),
                thread.getPinned(),
                UserDTO.fromEntity(thread.getAuthor()),
                replyCount,
                thread.getDiscussionType(),
                thread.getNarrative() != null ? thread.getNarrative().getId() : null,
                thread.getNarrative() != null ? thread.getNarrative().getName() : null,
                thread.getAlert() != null ? thread.getAlert().getId() : null,
                thread.getAlert() != null ? thread.getAlert().getTitle() : null,
                thread.getCreatedAt(),
                thread.getUpdatedAt()
        );
    }
}
