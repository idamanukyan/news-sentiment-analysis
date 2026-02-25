package com.newssentiment.service;

import com.newssentiment.dto.ArticleDTO;
import com.newssentiment.dto.ArticleFilterRequest;
import com.newssentiment.model.Article;
import com.newssentiment.model.SentimentResult;
import com.newssentiment.model.Source;
import com.newssentiment.model.Topic;
import com.newssentiment.repository.ArticleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ArticleService Tests")
class ArticleServiceTest {

    @Mock
    private ArticleRepository articleRepository;

    @InjectMocks
    private ArticleService articleService;

    private Article testArticle;
    private Source testSource;
    private Topic testTopic;
    private SentimentResult testSentiment;

    @BeforeEach
    void setUp() {
        testSource = Source.builder()
                .id(1L)
                .name("Test Source")
                .url("https://example.com")
                .build();

        testTopic = Topic.builder()
                .id(1L)
                .name("Test Topic")
                .build();

        testSentiment = SentimentResult.builder()
                .id(1L)
                .sentiment(SentimentResult.Sentiment.POSITIVE)
                .confidence(new BigDecimal("0.85"))
                .build();

        testArticle = Article.builder()
                .id(1L)
                .title("Test Article Title")
                .content("This is the article content for testing purposes.")
                .url("https://example.com/article/1")
                .source(testSource)
                .topic(testTopic)
                .publishedAt(Instant.now())
                .fetchedAt(Instant.now())
                .sentimentResult(testSentiment)
                .build();

        testSentiment.setArticle(testArticle);
    }

    @Nested
    @DisplayName("findWithFilters tests")
    class FindWithFiltersTests {

        @Test
        @DisplayName("Should return articles with no filters")
        void shouldReturnArticlesWithNoFilters() {
            Pageable pageable = PageRequest.of(0, 20);
            ArticleFilterRequest filter = new ArticleFilterRequest(
                    null, null, null, null, null, null, null, null, null, null, null
            );
            Page<Article> articlePage = new PageImpl<>(List.of(testArticle), pageable, 1);

            when(articleRepository.findAll(any(Specification.class), eq(pageable)))
                    .thenReturn(articlePage);

            Page<ArticleDTO> result = articleService.findWithFilters(filter, pageable);

            assertThat(result.getContent()).hasSize(1);
            assertThat(result.getContent().get(0).title()).isEqualTo("Test Article Title");
            assertThat(result.getContent().get(0).sentiment()).isEqualTo("POSITIVE");
        }

        @Test
        @DisplayName("Should return empty page when no articles match")
        void shouldReturnEmptyPageWhenNoMatch() {
            Pageable pageable = PageRequest.of(0, 20);
            ArticleFilterRequest filter = new ArticleFilterRequest(
                    999L, null, null, null, null, null, null, null, null, null, null
            );
            Page<Article> emptyPage = new PageImpl<>(List.of(), pageable, 0);

            when(articleRepository.findAll(any(Specification.class), eq(pageable)))
                    .thenReturn(emptyPage);

            Page<ArticleDTO> result = articleService.findWithFilters(filter, pageable);

            assertThat(result.getContent()).isEmpty();
        }

        @Test
        @DisplayName("Should properly map article to DTO")
        void shouldProperlyMapArticleToDTO() {
            Pageable pageable = PageRequest.of(0, 20);
            ArticleFilterRequest filter = new ArticleFilterRequest(
                    null, null, null, null, null, null, null, null, null, null, null
            );
            Page<Article> articlePage = new PageImpl<>(List.of(testArticle), pageable, 1);

            when(articleRepository.findAll(any(Specification.class), eq(pageable)))
                    .thenReturn(articlePage);

            Page<ArticleDTO> result = articleService.findWithFilters(filter, pageable);
            ArticleDTO dto = result.getContent().get(0);

            assertThat(dto.id()).isEqualTo(1L);
            assertThat(dto.title()).isEqualTo("Test Article Title");
            assertThat(dto.sourceName()).isEqualTo("Test Source");
            assertThat(dto.topicName()).isEqualTo("Test Topic");
            assertThat(dto.sentiment()).isEqualTo("POSITIVE");
            assertThat(dto.confidence()).isEqualTo(new BigDecimal("0.85"));
        }

        @Test
        @DisplayName("Should truncate long content for snippet")
        void shouldTruncateLongContentForSnippet() {
            String longContent = "A".repeat(300);
            testArticle.setContent(longContent);

            Pageable pageable = PageRequest.of(0, 20);
            ArticleFilterRequest filter = new ArticleFilterRequest(
                    null, null, null, null, null, null, null, null, null, null, null
            );
            Page<Article> articlePage = new PageImpl<>(List.of(testArticle), pageable, 1);

            when(articleRepository.findAll(any(Specification.class), eq(pageable)))
                    .thenReturn(articlePage);

            Page<ArticleDTO> result = articleService.findWithFilters(filter, pageable);
            ArticleDTO dto = result.getContent().get(0);

            assertThat(dto.snippet()).hasSize(203); // 200 chars + "..."
            assertThat(dto.snippet()).endsWith("...");
        }
    }

    @Nested
    @DisplayName("findById tests")
    class FindByIdTests {

        @Test
        @DisplayName("Should return article when found")
        void shouldReturnArticleWhenFound() {
            when(articleRepository.findById(1L)).thenReturn(Optional.of(testArticle));

            Optional<ArticleDTO> result = articleService.findById(1L);

            assertThat(result).isPresent();
            assertThat(result.get().title()).isEqualTo("Test Article Title");
        }

        @Test
        @DisplayName("Should return empty when article not found")
        void shouldReturnEmptyWhenNotFound() {
            when(articleRepository.findById(999L)).thenReturn(Optional.empty());

            Optional<ArticleDTO> result = articleService.findById(999L);

            assertThat(result).isEmpty();
        }
    }

    @Nested
    @DisplayName("save tests")
    class SaveTests {

        @Test
        @DisplayName("Should compute content hash when saving")
        void shouldComputeContentHashWhenSaving() {
            Article newArticle = Article.builder()
                    .title("New Article")
                    .content("Some content")
                    .build();

            when(articleRepository.save(any(Article.class))).thenAnswer(i -> i.getArgument(0));

            Article saved = articleService.save(newArticle);

            assertThat(saved.getContentHash()).isNotNull();
            assertThat(saved.getContentHash()).hasSize(64); // SHA-256 produces 64 hex chars
        }

        @Test
        @DisplayName("Should not compute hash when content is null")
        void shouldNotComputeHashWhenContentIsNull() {
            Article newArticle = Article.builder()
                    .title("New Article")
                    .content(null)
                    .build();

            when(articleRepository.save(any(Article.class))).thenAnswer(i -> i.getArgument(0));

            Article saved = articleService.save(newArticle);

            assertThat(saved.getContentHash()).isNull();
        }
    }

    @Nested
    @DisplayName("existsByContentHash tests")
    class ExistsByContentHashTests {

        @Test
        @DisplayName("Should return true when hash exists")
        void shouldReturnTrueWhenHashExists() {
            when(articleRepository.existsByContentHash("abc123")).thenReturn(true);

            boolean result = articleService.existsByContentHash("abc123");

            assertThat(result).isTrue();
        }

        @Test
        @DisplayName("Should return false when hash does not exist")
        void shouldReturnFalseWhenHashDoesNotExist() {
            when(articleRepository.existsByContentHash("xyz789")).thenReturn(false);

            boolean result = articleService.existsByContentHash("xyz789");

            assertThat(result).isFalse();
        }
    }
}
