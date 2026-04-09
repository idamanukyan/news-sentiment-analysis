package com.newssentiment.service;

import com.newssentiment.model.Topic;
import com.newssentiment.model.User;
import com.newssentiment.repository.TopicRepository;
import com.newssentiment.security.OrganizationContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class TopicService {

    private final TopicRepository topicRepository;

    public List<Topic> getTopicsByUser(User user) {
        return topicRepository.findByUserOrderByCreatedAtDesc(user);
    }

    public Optional<Topic> getTopicByIdAndUser(Long id, User user) {
        return topicRepository.findByIdAndUser(id, user);
    }

    @Transactional
    public Topic createTopic(User user, String name, List<String> keywords, List<Long> sourceIds, Boolean globalSearch, String language) {
        if (user == null) {
            throw new IllegalArgumentException("Authenticated user is required to create a topic");
        }

        Long organizationId = resolveOrganizationId(user);
        if (organizationId == null) {
            log.warn("Cannot create topic: user {} has no organization context", user.getId());
            throw new IllegalArgumentException("User does not belong to an organization");
        }

        String trimmedName = name == null ? null : name.trim();
        if (trimmedName == null || trimmedName.isEmpty()) {
            throw new IllegalArgumentException("Topic name is required");
        }

        String[] keywordArray = sanitizeKeywords(keywords);
        if (keywordArray.length == 0) {
            throw new IllegalArgumentException("At least one keyword is required");
        }

        Topic topic = Topic.builder()
                .organizationId(organizationId)
                .user(user)
                .name(trimmedName)
                .keywords(keywordArray)
                .sourceIds(sourceIds != null ? sourceIds.toArray(new Long[0]) : null)
                .globalSearch(globalSearch != null ? globalSearch : false)
                .language(language != null && !language.isBlank() ? language : "en")
                .build();

        try {
            Topic saved = topicRepository.save(topic);
            log.info("Created topic id={} name='{}' for user={} org={}", saved.getId(), saved.getName(), user.getId(), organizationId);
            return saved;
        } catch (Exception e) {
            log.error("Failed to persist topic '{}' for user={} org={}: {}", trimmedName, user.getId(), organizationId, e.getMessage(), e);
            throw e;
        }
    }

    @Transactional
    public Optional<Topic> updateTopic(Long id, User user, String name, List<String> keywords, List<Long> sourceIds, Boolean globalSearch, String language) {
        if (user == null) {
            throw new IllegalArgumentException("Authenticated user is required to update a topic");
        }
        return topicRepository.findByIdAndUser(id, user)
                .map(topic -> {
                    String trimmedName = name == null ? null : name.trim();
                    if (trimmedName == null || trimmedName.isEmpty()) {
                        throw new IllegalArgumentException("Topic name is required");
                    }
                    String[] keywordArray = sanitizeKeywords(keywords);
                    if (keywordArray.length == 0) {
                        throw new IllegalArgumentException("At least one keyword is required");
                    }

                    topic.setName(trimmedName);
                    topic.setKeywords(keywordArray);
                    topic.setSourceIds(sourceIds != null ? sourceIds.toArray(new Long[0]) : null);
                    if (globalSearch != null) {
                        topic.setGlobalSearch(globalSearch);
                    }
                    if (language != null && !language.isBlank()) {
                        topic.setLanguage(language);
                    }
                    return topicRepository.save(topic);
                });
    }

    private Long resolveOrganizationId(User user) {
        Long fromContext = OrganizationContext.getCurrentOrganizationIdOrNull();
        if (fromContext != null) {
            return fromContext;
        }
        return user.getOrganizationId();
    }

    private String[] sanitizeKeywords(List<String> keywords) {
        if (keywords == null) {
            return new String[0];
        }
        return keywords.stream()
                .filter(java.util.Objects::nonNull)
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toArray(String[]::new);
    }

    @Transactional
    public boolean deleteTopic(Long id, User user) {
        return topicRepository.findByIdAndUser(id, user)
                .map(topic -> {
                    topicRepository.delete(topic);
                    return true;
                })
                .orElse(false);
    }

    public List<Topic> getGlobalSearchTopics() {
        return topicRepository.findByGlobalSearchTrue();
    }
}
