package com.newssentiment.dto;

import com.newssentiment.model.DiscussionReply;

import java.time.Instant;

public record DiscussionReplyDTO(
        Long id,
        String content,
        UserDTO author,
        Instant createdAt,
        Instant updatedAt
) {
    public static DiscussionReplyDTO fromEntity(DiscussionReply reply) {
        return new DiscussionReplyDTO(
                reply.getId(),
                reply.getContent(),
                UserDTO.fromEntity(reply.getAuthor()),
                reply.getCreatedAt(),
                reply.getUpdatedAt()
        );
    }
}
