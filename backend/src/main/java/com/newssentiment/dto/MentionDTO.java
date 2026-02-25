package com.newssentiment.dto;

import com.newssentiment.model.DiscussionMention;

import java.time.Instant;

public record MentionDTO(
        Long id,
        Long threadId,
        String threadTitle,
        Long replyId,
        UserDTO mentioner,
        Boolean isRead,
        Instant createdAt
) {
    public static MentionDTO fromEntity(DiscussionMention mention) {
        return new MentionDTO(
                mention.getId(),
                mention.getThread() != null ? mention.getThread().getId() :
                    (mention.getReply() != null ? mention.getReply().getThread().getId() : null),
                mention.getThread() != null ? mention.getThread().getTitle() :
                    (mention.getReply() != null ? mention.getReply().getThread().getTitle() : null),
                mention.getReply() != null ? mention.getReply().getId() : null,
                UserDTO.fromEntity(mention.getMentioner()),
                mention.getIsRead(),
                mention.getCreatedAt()
        );
    }
}
