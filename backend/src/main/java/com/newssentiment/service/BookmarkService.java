package com.newssentiment.service;

import com.newssentiment.dto.ArticleDTO;
import com.newssentiment.dto.BookmarkDTO;
import com.newssentiment.model.Article;
import com.newssentiment.model.Bookmark;
import com.newssentiment.model.User;
import com.newssentiment.repository.ArticleRepository;
import com.newssentiment.repository.BookmarkRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class BookmarkService {

    private final BookmarkRepository bookmarkRepository;
    private final ArticleRepository articleRepository;
    private final ArticleService articleService;

    @Transactional
    public BookmarkDTO addBookmark(User user, Long articleId) {
        if (bookmarkRepository.existsByUserIdAndArticleId(user.getId(), articleId)) {
            throw new IllegalStateException("Article already bookmarked");
        }

        Article article = articleRepository.findById(articleId)
            .orElseThrow(() -> new IllegalArgumentException("Article not found"));

        Bookmark bookmark = Bookmark.builder()
            .user(user)
            .article(article)
            .build();

        Bookmark saved = bookmarkRepository.save(bookmark);
        log.info("User {} bookmarked article {}", user.getEmail(), articleId);

        return new BookmarkDTO(saved.getId(), articleId, saved.getCreatedAt());
    }

    @Transactional
    public void removeBookmark(User user, Long articleId) {
        bookmarkRepository.deleteByUserIdAndArticleId(user.getId(), articleId);
        log.info("User {} removed bookmark for article {}", user.getEmail(), articleId);
    }

    @Transactional(readOnly = true)
    public boolean isBookmarked(Long userId, Long articleId) {
        return bookmarkRepository.existsByUserIdAndArticleId(userId, articleId);
    }

    @Transactional(readOnly = true)
    public Set<Long> getBookmarkedArticleIds(Long userId, List<Long> articleIds) {
        if (articleIds == null || articleIds.isEmpty()) {
            return Set.of();
        }
        return bookmarkRepository.findBookmarkedArticleIds(userId, articleIds);
    }

    @Transactional(readOnly = true)
    public Page<ArticleDTO> getBookmarkedArticles(Long userId, Pageable pageable) {
        Page<Article> articles = bookmarkRepository.findArticlesByUserId(userId, pageable);
        return articles.map(articleService::toDTO);
    }

    @Transactional(readOnly = true)
    public long getBookmarkCount(Long userId) {
        return bookmarkRepository.countByUserId(userId);
    }
}
