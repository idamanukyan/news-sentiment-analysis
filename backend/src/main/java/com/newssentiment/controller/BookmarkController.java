package com.newssentiment.controller;

import com.newssentiment.dto.ArticleDTO;
import com.newssentiment.dto.BookmarkDTO;
import com.newssentiment.model.User;
import com.newssentiment.service.BookmarkService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/v1/bookmarks")
@RequiredArgsConstructor
public class BookmarkController {

    private final BookmarkService bookmarkService;

    @GetMapping
    public ResponseEntity<Page<ArticleDTO>> getBookmarks(
            @AuthenticationPrincipal User user,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        return ResponseEntity.ok(bookmarkService.getBookmarkedArticles(user.getId(), pageable));
    }

    @PostMapping("/articles/{articleId}")
    public ResponseEntity<BookmarkDTO> addBookmark(
            @AuthenticationPrincipal User user,
            @PathVariable Long articleId
    ) {
        try {
            BookmarkDTO bookmark = bookmarkService.addBookmark(user, articleId);
            return ResponseEntity.status(HttpStatus.CREATED).body(bookmark);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/articles/{articleId}")
    public ResponseEntity<Void> removeBookmark(
            @AuthenticationPrincipal User user,
            @PathVariable Long articleId
    ) {
        bookmarkService.removeBookmark(user, articleId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/articles/{articleId}")
    public ResponseEntity<Map<String, Boolean>> isBookmarked(
            @AuthenticationPrincipal User user,
            @PathVariable Long articleId
    ) {
        boolean bookmarked = bookmarkService.isBookmarked(user.getId(), articleId);
        return ResponseEntity.ok(Map.of("bookmarked", bookmarked));
    }

    @PostMapping("/check")
    public ResponseEntity<Set<Long>> checkBookmarks(
            @AuthenticationPrincipal User user,
            @RequestBody List<Long> articleIds
    ) {
        Set<Long> bookmarkedIds = bookmarkService.getBookmarkedArticleIds(user.getId(), articleIds);
        return ResponseEntity.ok(bookmarkedIds);
    }

    @GetMapping("/count")
    public ResponseEntity<Map<String, Long>> getBookmarkCount(
            @AuthenticationPrincipal User user
    ) {
        return ResponseEntity.ok(Map.of("count", bookmarkService.getBookmarkCount(user.getId())));
    }
}
