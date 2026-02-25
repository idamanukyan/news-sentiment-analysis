package com.newssentiment.service;

import com.newssentiment.dto.NarrativeCreateRequest;
import com.newssentiment.dto.NarrativeDTO;
import com.newssentiment.model.Narrative;
import com.newssentiment.model.Narrative.NarrativeStatus;
import com.newssentiment.model.Narrative.ThreatLevel;
import com.newssentiment.repository.ArticleRepository;
import com.newssentiment.repository.CoordinationEventRepository;
import com.newssentiment.repository.FactCheckRepository;
import com.newssentiment.repository.NarrativeRepository;
import com.newssentiment.repository.ThreatAlertRepository;
import com.newssentiment.security.OrganizationContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class NarrativeService {

    private final NarrativeRepository narrativeRepository;
    private final ThreatAlertRepository alertRepository;
    private final ArticleRepository articleRepository;
    private final CoordinationEventRepository coordinationEventRepository;
    private final FactCheckRepository factCheckRepository;

    private Long getOrgId() {
        return OrganizationContext.getCurrentOrganizationIdOrNull();
    }

    @Transactional(readOnly = true)
    public Page<NarrativeDTO> findAll(Pageable pageable) {
        return narrativeRepository.findByOrganizationId(getOrgId(), pageable).map(this::toDTO);
    }

    @Transactional(readOnly = true)
    public Page<NarrativeDTO> findByStatuses(List<NarrativeStatus> statuses, Pageable pageable) {
        return narrativeRepository.findByOrganizationIdAndStatusIn(getOrgId(), statuses, pageable).map(this::toDTO);
    }

    @Transactional(readOnly = true)
    public Optional<NarrativeDTO> findById(Long id) {
        return narrativeRepository.findByIdAndOrganizationId(id, getOrgId()).map(this::toDTO);
    }

    @Transactional(readOnly = true)
    public List<NarrativeDTO> findActive() {
        return narrativeRepository.findByOrganizationIdAndStatus(getOrgId(), NarrativeStatus.ACTIVE)
                .stream()
                .map(this::toDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<NarrativeDTO> findTopByArticleCount(int limit) {
        return narrativeRepository.findByOrganizationIdAndStatusOrderByArticleCount(getOrgId(), NarrativeStatus.ACTIVE)
                .stream()
                .limit(limit)
                .map(this::toDTO)
                .toList();
    }

    @Transactional
    public NarrativeDTO create(NarrativeCreateRequest request) {
        Narrative narrative = Narrative.builder()
                .organizationId(getOrgId())
                .name(request.name())
                .description(request.description())
                .keywords(request.keywords() != null ? request.keywords().toArray(new String[0]) : null)
                .threatLevel(request.threatLevel() != null
                        ? ThreatLevel.valueOf(request.threatLevel().toUpperCase())
                        : ThreatLevel.LOW)
                .status(NarrativeStatus.ACTIVE)
                .firstSeen(Instant.now())
                .articleCount(0)
                .build();

        return toDTO(narrativeRepository.save(narrative));
    }

    @Transactional
    public Optional<NarrativeDTO> updateStatus(Long id, NarrativeStatus status) {
        return narrativeRepository.findByIdAndOrganizationId(id, getOrgId())
                .map(narrative -> {
                    narrative.setStatus(status);
                    return toDTO(narrativeRepository.save(narrative));
                });
    }

    @Transactional
    public Optional<NarrativeDTO> updateThreatLevel(Long id, ThreatLevel level) {
        return narrativeRepository.findByIdAndOrganizationId(id, getOrgId())
                .map(narrative -> {
                    narrative.setThreatLevel(level);
                    return toDTO(narrativeRepository.save(narrative));
                });
    }

    @Transactional
    public void delete(Long id) {
        narrativeRepository.findByIdAndOrganizationId(id, getOrgId())
                .ifPresent(narrativeRepository::delete);
    }

    /**
     * Detect narratives in article content based on keywords.
     * Returns list of matching narrative IDs.
     */
    @Transactional(readOnly = true)
    public List<Long> detectNarratives(String title, String content) {
        String searchText = (title + " " + content).toLowerCase();

        return narrativeRepository.findByStatus(NarrativeStatus.ACTIVE)
                .stream()
                .filter(narrative -> matchesKeywords(searchText, narrative.getKeywords()))
                .map(Narrative::getId)
                .toList();
    }

    /**
     * Update article counts for all narratives based on keyword matches.
     * Called periodically by scheduler.
     */
    @Transactional
    public void updateNarrativeCounts() {
        log.info("Updating narrative article counts...");
        Instant since = Instant.now().minus(7, ChronoUnit.DAYS);

        List<Narrative> activeNarratives = narrativeRepository.findByStatus(NarrativeStatus.ACTIVE);

        for (Narrative narrative : activeNarratives) {
            String[] keywords = narrative.getKeywords();
            if (keywords == null || keywords.length == 0) {
                continue;
            }

            // Count articles matching keywords in the last 7 days
            long count = articleRepository.countByKeywordsSince(keywords, since);

            int previousCount = narrative.getArticleCount() != null ? narrative.getArticleCount() : 0;
            narrative.setArticleCount((int) count);

            // Update lastSeen if we found new articles
            if (count > previousCount) {
                narrative.setLastSeen(Instant.now());
            }

            narrativeRepository.save(narrative);
            log.debug("Narrative '{}': {} articles (was: {})", narrative.getName(), count, previousCount);
        }

        log.info("Updated {} narrative counts", activeNarratives.size());
    }

    @Transactional(readOnly = true)
    public long countActive() {
        return narrativeRepository.countByOrganizationIdAndStatus(getOrgId(), NarrativeStatus.ACTIVE);
    }

    @Transactional(readOnly = true)
    public ThreatLevel getOverallThreatLevel() {
        Long orgId = getOrgId();
        long critical = narrativeRepository.countByOrganizationIdAndActiveByThreatLevel(orgId, ThreatLevel.CRITICAL);
        long high = narrativeRepository.countByOrganizationIdAndActiveByThreatLevel(orgId, ThreatLevel.HIGH);
        long medium = narrativeRepository.countByOrganizationIdAndActiveByThreatLevel(orgId, ThreatLevel.MEDIUM);

        if (critical > 0) return ThreatLevel.CRITICAL;
        if (high >= 2) return ThreatLevel.HIGH;
        if (high >= 1 || medium >= 3) return ThreatLevel.MEDIUM;
        return ThreatLevel.LOW;
    }

    private boolean matchesKeywords(String text, String[] keywords) {
        if (keywords == null || keywords.length == 0) return false;
        return java.util.Arrays.stream(keywords).anyMatch(keyword -> text.contains(keyword.toLowerCase()));
    }

    private NarrativeDTO toDTO(Narrative narrative) {
        int alertCount = narrative.getAlerts() != null ? narrative.getAlerts().size() : 0;

        // Get coordination event info for this narrative
        boolean hasCoordination = coordinationEventRepository.hasActiveCoordinationEvents(narrative.getId());
        int coordinationCount = coordinationEventRepository.countByNarrativeId(narrative.getId());

        // Get fact-check info
        int factCheckCount = (int) factCheckRepository.countByNarrativeId(narrative.getId());
        boolean hasFactChecks = factCheckCount > 0;

        return new NarrativeDTO(
                narrative.getId(),
                narrative.getName(),
                narrative.getDescription(),
                narrative.getKeywords() != null ? java.util.Arrays.asList(narrative.getKeywords()) : null,
                narrative.getStatus().name(),
                narrative.getThreatLevel().name(),
                narrative.getFirstSeen(),
                narrative.getLastSeen(),
                narrative.getArticleCount(),
                alertCount,
                hasCoordination,
                coordinationCount,
                factCheckCount,
                hasFactChecks,
                narrative.getCreatedAt()
        );
    }
}
