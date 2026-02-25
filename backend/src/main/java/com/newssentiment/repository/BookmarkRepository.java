package com.newssentiment.repository;

import com.newssentiment.model.Article;
import com.newssentiment.model.Bookmark;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;

@Repository
public interface BookmarkRepository extends JpaRepository<Bookmark, Long> {

    Optional<Bookmark> findByUserIdAndArticleId(Long userId, Long articleId);

    boolean existsByUserIdAndArticleId(Long userId, Long articleId);

    @Modifying
    void deleteByUserIdAndArticleId(Long userId, Long articleId);

    @Query("SELECT b.article FROM Bookmark b WHERE b.user.id = :userId ORDER BY b.createdAt DESC")
    Page<Article> findArticlesByUserId(@Param("userId") Long userId, Pageable pageable);

    @Query("SELECT b.article.id FROM Bookmark b WHERE b.user.id = :userId AND b.article.id IN :articleIds")
    Set<Long> findBookmarkedArticleIds(
        @Param("userId") Long userId,
        @Param("articleIds") List<Long> articleIds
    );

    long countByUserId(Long userId);
}
