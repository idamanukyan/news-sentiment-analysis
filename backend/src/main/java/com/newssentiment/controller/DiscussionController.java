package com.newssentiment.controller;

import com.newssentiment.dto.*;
import com.newssentiment.model.User;
import com.newssentiment.service.DiscussionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/discussions")
@RequiredArgsConstructor
public class DiscussionController {

    private final DiscussionService discussionService;

    // ============ Thread Endpoints ============

    @GetMapping("/threads")
    public ResponseEntity<List<DiscussionThreadDTO>> getThreads() {
        return ResponseEntity.ok(discussionService.getThreads());
    }

    @GetMapping("/threads/{id}")
    public ResponseEntity<DiscussionService.ThreadDetailDTO> getThread(@PathVariable Long id) {
        return discussionService.getThread(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/threads")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ORG_ADMIN', 'ANALYST')")
    public ResponseEntity<DiscussionThreadDTO> createThread(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody ThreadCreateRequest request
    ) {
        try {
            DiscussionThreadDTO created = discussionService.createThread(user.getId(), request);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(null);
        }
    }

    @PutMapping("/threads/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ORG_ADMIN', 'ANALYST')")
    public ResponseEntity<DiscussionThreadDTO> updateThread(
            @PathVariable Long id,
            @AuthenticationPrincipal User user,
            @Valid @RequestBody ThreadCreateRequest request
    ) {
        return discussionService.updateThread(id, user.getId(), request)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/threads/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ORG_ADMIN', 'ANALYST')")
    public ResponseEntity<Void> deleteThread(
            @PathVariable Long id,
            @AuthenticationPrincipal User user
    ) {
        if (discussionService.deleteThread(id, user.getId())) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping("/threads/{id}/pin")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<DiscussionThreadDTO> pinThread(
            @PathVariable Long id,
            @RequestBody Map<String, Boolean> body
    ) {
        boolean pin = body.getOrDefault("pin", true);
        return discussionService.pinThread(id, pin)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // ============ Reply Endpoints ============

    @PostMapping("/threads/{threadId}/replies")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ORG_ADMIN', 'ANALYST')")
    public ResponseEntity<DiscussionReplyDTO> addReply(
            @PathVariable Long threadId,
            @AuthenticationPrincipal User user,
            @Valid @RequestBody ReplyCreateRequest request
    ) {
        return discussionService.addReply(threadId, user.getId(), request)
                .map(reply -> ResponseEntity.status(HttpStatus.CREATED).body(reply))
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/replies/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ORG_ADMIN', 'ANALYST')")
    public ResponseEntity<DiscussionReplyDTO> updateReply(
            @PathVariable Long id,
            @AuthenticationPrincipal User user,
            @Valid @RequestBody ReplyCreateRequest request
    ) {
        return discussionService.updateReply(id, user.getId(), request)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/replies/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ORG_ADMIN', 'ANALYST')")
    public ResponseEntity<Void> deleteReply(
            @PathVariable Long id,
            @AuthenticationPrincipal User user
    ) {
        if (discussionService.deleteReply(id, user.getId())) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }

    // ============ Mention Endpoints ============

    @GetMapping("/mentions")
    public ResponseEntity<List<MentionDTO>> getUnreadMentions(
            @AuthenticationPrincipal User user
    ) {
        return ResponseEntity.ok(discussionService.getUnreadMentions(user.getId()));
    }

    @GetMapping("/mentions/count")
    public ResponseEntity<Map<String, Long>> getUnreadMentionCount(
            @AuthenticationPrincipal User user
    ) {
        return ResponseEntity.ok(Map.of("count", discussionService.getUnreadMentionCount(user.getId())));
    }

    @PostMapping("/mentions/{id}/read")
    public ResponseEntity<Void> markMentionAsRead(
            @PathVariable Long id,
            @AuthenticationPrincipal User user
    ) {
        discussionService.markMentionAsRead(id, user.getId());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/mentions/read-all")
    public ResponseEntity<Void> markAllMentionsAsRead(
            @AuthenticationPrincipal User user
    ) {
        discussionService.markAllMentionsAsRead(user.getId());
        return ResponseEntity.ok().build();
    }
}
