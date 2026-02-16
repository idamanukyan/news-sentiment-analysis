package com.newssentiment.controller;

import com.newssentiment.dto.TopicDTO;
import com.newssentiment.model.Topic;
import com.newssentiment.model.User;
import com.newssentiment.service.TopicService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/topics")
@RequiredArgsConstructor
public class TopicController {

    private final TopicService topicService;

    @GetMapping
    public ResponseEntity<List<TopicDTO>> getAllTopics(@AuthenticationPrincipal User user) {
        List<TopicDTO> topics = topicService.getTopicsByUser(user).stream()
                .map(TopicDTO::fromEntity)
                .toList();
        return ResponseEntity.ok(topics);
    }

    @GetMapping("/{id}")
    public ResponseEntity<TopicDTO> getTopic(@PathVariable Long id, @AuthenticationPrincipal User user) {
        return topicService.getTopicByIdAndUser(id, user)
                .map(TopicDTO::fromEntity)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<TopicDTO> createTopic(@RequestBody CreateTopicRequest request, @AuthenticationPrincipal User user) {
        Topic topic = topicService.createTopic(
                user,
                request.name(),
                request.keywords(),
                request.sourceIds(),
                request.globalSearch(),
                request.language()
        );
        return ResponseEntity.ok(TopicDTO.fromEntity(topic));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TopicDTO> updateTopic(
            @PathVariable Long id,
            @RequestBody CreateTopicRequest request,
            @AuthenticationPrincipal User user
    ) {
        return topicService.updateTopic(id, user, request.name(), request.keywords(), request.sourceIds(), request.globalSearch(), request.language())
                .map(TopicDTO::fromEntity)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTopic(@PathVariable Long id, @AuthenticationPrincipal User user) {
        if (topicService.deleteTopic(id, user)) {
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }

    public record CreateTopicRequest(
            String name,
            List<String> keywords,
            List<Long> sourceIds,
            Boolean globalSearch,
            String language
    ) {}
}
