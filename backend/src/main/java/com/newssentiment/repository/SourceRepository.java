package com.newssentiment.repository;

import com.newssentiment.model.Source;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SourceRepository extends JpaRepository<Source, Long> {

    List<Source> findByActiveTrue();

    List<Source> findByLanguage(Source.Language language);

    List<Source> findByType(Source.SourceType type);

    @Query("SELECT s FROM Source s WHERE s.active = true AND s.type = :type")
    List<Source> findActiveByType(Source.SourceType type);

    boolean existsByUrl(String url);
}
