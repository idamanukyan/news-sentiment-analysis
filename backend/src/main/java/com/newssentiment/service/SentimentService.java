package com.newssentiment.service;

import com.newssentiment.dto.SentimentAggregateDTO;
import com.newssentiment.model.SentimentResult;
import com.newssentiment.repository.SentimentResultRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SentimentService {

    private final SentimentResultRepository sentimentResultRepository;

    @Transactional
    public SentimentResult save(SentimentResult result) {
        return sentimentResultRepository.save(result);
    }

    @Transactional(readOnly = true)
    public Optional<SentimentResult> findByArticleId(Long articleId) {
        return sentimentResultRepository.findByArticleId(articleId);
    }

    @Transactional(readOnly = true)
    public List<SentimentAggregateDTO> getAggregatedByDay(Instant from, Instant to) {
        List<Object[]> results = sentimentResultRepository.countByDayAndSentimentBetween(from, to);
        return aggregateResults(results, "day");
    }

    @Transactional(readOnly = true)
    public List<SentimentAggregateDTO> getAggregatedBySource(Instant from, Instant to) {
        List<Object[]> results = sentimentResultRepository.countBySourceAndSentimentBetween(from, to);
        return aggregateResults(results, "source");
    }

    @Transactional(readOnly = true)
    public Map<String, Long> getOverallCounts(Instant from, Instant to) {
        List<Object[]> results = sentimentResultRepository.countBySentimentBetween(from, to);
        Map<String, Long> counts = new HashMap<>();
        counts.put("POSITIVE", 0L);
        counts.put("NEGATIVE", 0L);
        counts.put("NEUTRAL", 0L);

        for (Object[] row : results) {
            SentimentResult.Sentiment sentiment = (SentimentResult.Sentiment) row[0];
            Long count = (Long) row[1];
            counts.put(sentiment.name(), count);
        }

        return counts;
    }

    private List<SentimentAggregateDTO> aggregateResults(List<Object[]> results, String groupType) {
        Map<Object, Map<String, Long>> grouped = new LinkedHashMap<>();

        for (Object[] row : results) {
            Object groupKey = row[0];
            SentimentResult.Sentiment sentiment = (SentimentResult.Sentiment) row[1];
            Long count = (Long) row[2];

            grouped.computeIfAbsent(groupKey, k -> {
                Map<String, Long> m = new HashMap<>();
                m.put("POSITIVE", 0L);
                m.put("NEGATIVE", 0L);
                m.put("NEUTRAL", 0L);
                return m;
            }).merge(sentiment.name(), count, Long::sum);
        }

        return grouped.entrySet().stream()
                .map(entry -> {
                    String group = entry.getKey().toString();
                    Map<String, Long> counts = entry.getValue();
                    long total = counts.values().stream().mapToLong(Long::longValue).sum();
                    return new SentimentAggregateDTO(
                            group,
                            counts.get("POSITIVE"),
                            counts.get("NEGATIVE"),
                            counts.get("NEUTRAL"),
                            total
                    );
                })
                .collect(Collectors.toList());
    }
}
