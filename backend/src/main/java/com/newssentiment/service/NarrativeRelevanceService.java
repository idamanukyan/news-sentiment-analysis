package com.newssentiment.service;

import com.anthropic.client.AnthropicClient;
import com.anthropic.models.messages.Message;
import com.anthropic.models.messages.MessageCreateParams;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.newssentiment.model.Article;
import com.newssentiment.model.ArticleNarrative;
import com.newssentiment.model.Narrative;
import com.newssentiment.repository.ArticleNarrativeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class NarrativeRelevanceService {

    private final AnthropicClient anthropicClient;
    private final ArticleNarrativeRepository articleNarrativeRepository;
    private final ObjectMapper objectMapper;

    @Value("${app.anthropic.model:claude-3-haiku-20240307}")
    private String modelId;

    @Value("${app.anthropic.relevance.threshold:0.65}")
    private float relevanceThreshold;

    @Value("${app.anthropic.relevance.batch-size:20}")
    private int batchSize;

    @Value("${app.anthropic.relevance.max-per-run:200}")
    private int maxPerRun;

    private static final String RELEVANCE_PROMPT_TEMPLATE = """
        You are evaluating whether a news article is relevant to a specific narrative.

        NARRATIVE:
        Name: %s
        Description: %s
        Keywords: %s

        ARTICLE:
        Title: %s
        Content: %s

        Task: Determine if this article is discussing the narrative described above.
        Consider:
        1. Does the article discuss the same topic/issue as the narrative?
        2. Does it contain the narrative's themes or claims?
        3. Is it related enough to be useful for tracking this narrative?

        Respond with ONLY a JSON object (no markdown, no explanation):
        {"relevant": true/false, "confidence": 0.0-1.0, "reason": "brief explanation"}
        """;

    /**
     * Process a batch of unscored article-narrative pairs.
     * Returns the number of pairs processed.
     */
    @Transactional
    public int processUnscoredBatch() {
        List<ArticleNarrative> unscoredPairs = articleNarrativeRepository.findUnscoredPairs(
                PageRequest.of(0, Math.min(batchSize, maxPerRun))
        );

        if (unscoredPairs.isEmpty()) {
            log.debug("No unscored article-narrative pairs to process");
            return 0;
        }

        log.info("Processing {} unscored article-narrative pairs", unscoredPairs.size());
        int processed = 0;

        for (ArticleNarrative pair : unscoredPairs) {
            try {
                float score = evaluateRelevance(pair);
                articleNarrativeRepository.updateRelevanceScore(
                        pair.getArticleId(),
                        pair.getNarrativeId(),
                        score
                );
                processed++;

                // Rate limiting: small delay between API calls
                if (processed < unscoredPairs.size()) {
                    TimeUnit.MILLISECONDS.sleep(100);
                }
            } catch (Exception e) {
                log.error("Error evaluating relevance for article {} / narrative {}: {}",
                        pair.getArticleId(), pair.getNarrativeId(), e.getMessage());
                // Mark as scored with 0 to avoid reprocessing
                articleNarrativeRepository.updateRelevanceScore(
                        pair.getArticleId(),
                        pair.getNarrativeId(),
                        0.0f
                );
            }
        }

        log.info("Processed {} article-narrative pairs", processed);
        return processed;
    }

    /**
     * Process all unscored pairs up to maxPerRun limit.
     * Returns total number of pairs processed.
     */
    @Transactional
    public int processAllUnscored() {
        int totalProcessed = 0;
        int batchProcessed;

        while (totalProcessed < maxPerRun) {
            int remaining = maxPerRun - totalProcessed;
            int currentBatchSize = Math.min(batchSize, remaining);

            List<ArticleNarrative> unscoredPairs = articleNarrativeRepository.findUnscoredPairs(
                    PageRequest.of(0, currentBatchSize)
            );

            if (unscoredPairs.isEmpty()) {
                break;
            }

            batchProcessed = processBatch(unscoredPairs);
            totalProcessed += batchProcessed;

            if (batchProcessed < currentBatchSize) {
                break;
            }

            // Delay between batches
            try {
                TimeUnit.SECONDS.sleep(1);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }
        }

        return totalProcessed;
    }

    private int processBatch(List<ArticleNarrative> pairs) {
        int processed = 0;

        for (ArticleNarrative pair : pairs) {
            try {
                float score = evaluateRelevance(pair);
                articleNarrativeRepository.updateRelevanceScore(
                        pair.getArticleId(),
                        pair.getNarrativeId(),
                        score
                );
                processed++;

                // Rate limiting
                if (processed < pairs.size()) {
                    TimeUnit.MILLISECONDS.sleep(100);
                }
            } catch (Exception e) {
                log.error("Error evaluating relevance for article {} / narrative {}: {}",
                        pair.getArticleId(), pair.getNarrativeId(), e.getMessage());
                // Mark as scored with 0 to avoid reprocessing
                articleNarrativeRepository.updateRelevanceScore(
                        pair.getArticleId(),
                        pair.getNarrativeId(),
                        0.0f
                );
            }
        }

        return processed;
    }

    /**
     * Evaluate the relevance of a single article-narrative pair.
     */
    public float evaluateRelevance(ArticleNarrative pair) {
        Article article = pair.getArticle();
        Narrative narrative = pair.getNarrative();

        if (article == null || narrative == null) {
            log.warn("Missing article or narrative for pair {}/{}",
                    pair.getArticleId(), pair.getNarrativeId());
            return 0.0f;
        }

        // Prepare article content - prefer English translations
        String articleTitle = article.getTitleEn() != null ? article.getTitleEn() : article.getTitle();
        String articleContent = article.getContentEn() != null ? article.getContentEn() : article.getContent();

        // Truncate content if too long
        if (articleContent != null && articleContent.length() > 2000) {
            articleContent = articleContent.substring(0, 2000) + "...";
        }

        String prompt = String.format(RELEVANCE_PROMPT_TEMPLATE,
                narrative.getName(),
                narrative.getDescription() != null ? narrative.getDescription() : "",
                narrative.getKeywords() != null ? String.join(", ", narrative.getKeywords()) : "",
                articleTitle != null ? articleTitle : "",
                articleContent != null ? articleContent : ""
        );

        try {
            MessageCreateParams params = MessageCreateParams.builder()
                    .model(modelId)
                    .maxTokens(256L)
                    .addUserMessage(prompt)
                    .build();

            Message response = anthropicClient.messages().create(params);

            // Extract text from response using Optional pattern
            String responseText = response.content().stream()
                    .flatMap(block -> block.text().stream())
                    .map(textBlock -> textBlock.text())
                    .findFirst()
                    .orElse("");

            return parseRelevanceResponse(responseText);

        } catch (Exception e) {
            log.error("Error calling Anthropic API for article {}: {}",
                    article.getId(), e.getMessage());
            throw new RuntimeException("Failed to evaluate relevance", e);
        }
    }

    /**
     * Parse the JSON response from Claude and extract the confidence score.
     */
    private float parseRelevanceResponse(String responseText) {
        try {
            // Clean up response - remove any markdown formatting
            String cleanJson = responseText.trim();
            if (cleanJson.startsWith("```json")) {
                cleanJson = cleanJson.substring(7);
            }
            if (cleanJson.startsWith("```")) {
                cleanJson = cleanJson.substring(3);
            }
            if (cleanJson.endsWith("```")) {
                cleanJson = cleanJson.substring(0, cleanJson.length() - 3);
            }
            cleanJson = cleanJson.trim();

            JsonNode root = objectMapper.readTree(cleanJson);

            boolean relevant = root.path("relevant").asBoolean(false);
            float confidence = (float) root.path("confidence").asDouble(0.0);

            // If not relevant, return 0 regardless of confidence
            if (!relevant) {
                return 0.0f;
            }

            // Clamp confidence to 0-1 range
            return Math.max(0.0f, Math.min(1.0f, confidence));

        } catch (Exception e) {
            log.warn("Failed to parse relevance response: {} - {}", responseText, e.getMessage());
            return 0.0f;
        }
    }

    /**
     * Reset all relevance scores for re-evaluation.
     */
    @Transactional
    public int resetAllScores() {
        int count = articleNarrativeRepository.resetAllRelevanceScores();
        log.info("Reset {} relevance scores for re-evaluation", count);
        return count;
    }

    /**
     * Reset relevance scores for a specific narrative.
     */
    @Transactional
    public int resetScoresForNarrative(Long narrativeId) {
        int count = articleNarrativeRepository.resetRelevanceScoresByNarrativeId(narrativeId);
        log.info("Reset {} relevance scores for narrative {}", count, narrativeId);
        return count;
    }

    /**
     * Get count of unscored pairs.
     */
    @Transactional(readOnly = true)
    public long countUnscoredPairs() {
        return articleNarrativeRepository.countUnscoredPairs();
    }

    /**
     * Get the configured relevance threshold.
     */
    public float getRelevanceThreshold() {
        return relevanceThreshold;
    }
}
