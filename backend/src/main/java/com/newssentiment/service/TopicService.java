package com.newssentiment.service;

import com.newssentiment.model.Topic;
import com.newssentiment.model.User;
import com.newssentiment.repository.TopicRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
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
        Topic topic = Topic.builder()
                .user(user)
                .name(name)
                .keywords(keywords)
                .sourceIds(sourceIds)
                .globalSearch(globalSearch != null ? globalSearch : false)
                .language(language != null ? language : "en")
                .build();

        return topicRepository.save(topic);
    }

    @Transactional
    public Optional<Topic> updateTopic(Long id, User user, String name, List<String> keywords, List<Long> sourceIds, Boolean globalSearch, String language) {
        return topicRepository.findByIdAndUser(id, user)
                .map(topic -> {
                    topic.setName(name);
                    topic.setKeywords(keywords);
                    topic.setSourceIds(sourceIds);
                    if (globalSearch != null) {
                        topic.setGlobalSearch(globalSearch);
                    }
                    if (language != null) {
                        topic.setLanguage(language);
                    }
                    return topicRepository.save(topic);
                });
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
