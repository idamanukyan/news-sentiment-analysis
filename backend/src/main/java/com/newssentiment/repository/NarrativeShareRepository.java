package com.newssentiment.repository;

import com.newssentiment.model.NarrativeShare;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;

@Repository
public interface NarrativeShareRepository extends JpaRepository<NarrativeShare, Long> {

    List<NarrativeShare> findByNarrativeId(Long narrativeId);

    List<NarrativeShare> findBySharedWithUserId(Long userId);

    Optional<NarrativeShare> findByNarrativeIdAndSharedWithUserId(Long narrativeId, Long userId);

    boolean existsByNarrativeIdAndSharedWithUserId(Long narrativeId, Long userId);

    @Modifying
    void deleteByNarrativeIdAndSharedWithUserId(Long narrativeId, Long userId);

    @Query("SELECT ns.narrative.id FROM NarrativeShare ns WHERE ns.sharedWithUser.id = :userId")
    Set<Long> findSharedNarrativeIdsByUserId(@Param("userId") Long userId);

    @Query("SELECT ns.sharedWithUser.id FROM NarrativeShare ns WHERE ns.narrative.id = :narrativeId")
    Set<Long> findSharedUserIdsByNarrativeId(@Param("narrativeId") Long narrativeId);

    long countByNarrativeId(Long narrativeId);
}
