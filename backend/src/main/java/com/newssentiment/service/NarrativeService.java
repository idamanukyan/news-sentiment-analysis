package com.newssentiment.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.newssentiment.dto.AiSummaryDTO;
import com.newssentiment.dto.NarrativeCreateRequest;
import com.newssentiment.dto.NarrativeDTO;
import com.newssentiment.dto.SharedUserDTO;
import com.newssentiment.model.Narrative;
import com.newssentiment.model.Narrative.NarrativeStatus;
import com.newssentiment.model.Narrative.ThreatLevel;
import com.newssentiment.model.NarrativeShare;
import com.newssentiment.model.User;
import com.newssentiment.repository.ArticleNarrativeRepository;
import com.newssentiment.repository.ArticleRepository;
import com.newssentiment.repository.CoordinationEventRepository;
import com.newssentiment.repository.FactCheckRepository;
import com.newssentiment.repository.NarrativeRepository;
import com.newssentiment.repository.NarrativeShareRepository;
import com.newssentiment.repository.ThreatAlertRepository;
import com.newssentiment.repository.UserRepository;
import com.newssentiment.security.OrganizationContext;
import org.springframework.security.core.context.SecurityContextHolder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class NarrativeService {

    private final NarrativeRepository narrativeRepository;
    private final NarrativeShareRepository narrativeShareRepository;
    private final ThreatAlertRepository alertRepository;
    private final ArticleRepository articleRepository;
    private final ArticleNarrativeRepository articleNarrativeRepository;
    private final CoordinationEventRepository coordinationEventRepository;
    private final FactCheckRepository factCheckRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;
    private final NarrativeRelevanceService narrativeRelevanceService;

    /**
     * Window used when populating article_narratives by keyword matching for
     * user-created narratives. Articles outside this window are ignored, both
     * for relevance and to keep the insert query bounded.
     */
    private static final java.time.temporal.ChronoUnit BACKFILL_UNIT = java.time.temporal.ChronoUnit.DAYS;
    private static final long BACKFILL_DAYS = 90L;

    private Long getOrgId() {
        return OrganizationContext.getCurrentOrganizationIdOrNull();
    }

    private User getCurrentUser() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof User) {
            return (User) authentication.getPrincipal();
        }
        return null;
    }

    private Long getCurrentUserId() {
        User user = getCurrentUser();
        return user != null ? user.getId() : null;
    }

    /**
     * Find all narratives accessible to the current user (owned or shared with them).
     * Excludes PENDING_REVIEW narratives.
     */
    @Transactional(readOnly = true)
    public Page<NarrativeDTO> findAll(Pageable pageable) {
        Long userId = getCurrentUserId();
        if (userId == null) {
            return Page.empty(pageable);
        }
        return narrativeRepository.findAccessibleByUser(getOrgId(), userId, pageable).map(this::toDTO);
    }

    /**
     * Find narratives owned by the current user.
     */
    @Transactional(readOnly = true)
    public Page<NarrativeDTO> findMyNarratives(Pageable pageable) {
        Long userId = getCurrentUserId();
        if (userId == null) {
            return Page.empty(pageable);
        }
        return narrativeRepository.findByOrganizationIdAndCreatedByIdExcludingPendingReview(getOrgId(), userId, pageable).map(this::toDTO);
    }

    /**
     * Find narratives shared with the current user.
     */
    @Transactional(readOnly = true)
    public Page<NarrativeDTO> findSharedWithMe(Pageable pageable) {
        Long userId = getCurrentUserId();
        if (userId == null) {
            return Page.empty(pageable);
        }
        return narrativeRepository.findSharedWithUser(getOrgId(), userId, pageable).map(this::toDTO);
    }

    /**
     * Find all narratives including PENDING_REVIEW (for admin views).
     */
    @Transactional(readOnly = true)
    public Page<NarrativeDTO> findAllIncludingPending(Pageable pageable) {
        return narrativeRepository.findByOrganizationId(getOrgId(), pageable).map(this::toDTO);
    }

    /**
     * Find narratives pending review.
     */
    @Transactional(readOnly = true)
    public Page<NarrativeDTO> findPendingReview(Pageable pageable) {
        return narrativeRepository.findByOrganizationIdAndPendingReview(getOrgId(), pageable).map(this::toDTO);
    }

    /**
     * Count narratives pending review.
     */
    @Transactional(readOnly = true)
    public long countPendingReview() {
        return narrativeRepository.countByOrganizationIdAndPendingReview(getOrgId());
    }

    @Transactional(readOnly = true)
    public Page<NarrativeDTO> findByStatuses(List<NarrativeStatus> statuses, Pageable pageable) {
        Long userId = getCurrentUserId();
        if (userId == null) {
            return Page.empty(pageable);
        }
        return narrativeRepository.findAccessibleByUserAndStatusIn(getOrgId(), userId, statuses, pageable).map(this::toDTO);
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
        User currentUser = getCurrentUser();
        Narrative narrative = Narrative.builder()
                .organizationId(getOrgId())
                .createdBy(currentUser)
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

        Narrative saved = narrativeRepository.save(narrative);
        // Populate article_narratives by keyword match. The scraper only links
        // its own auto-clustered narratives, so user-created narratives would
        // otherwise show 0 articles in the detail view.
        populateArticleNarrativesByKeywords(saved);
        return toDTO(saved);
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

    /**
     * Update a narrative's properties (name, description, keywords, threat level).
     * Only updates fields that are provided (non-null).
     */
    @Transactional
    public Optional<NarrativeDTO> update(Long id, String name, String description,
                                          java.util.List<String> keywords, String threatLevel) {
        return narrativeRepository.findByIdAndOrganizationId(id, getOrgId())
                .map(narrative -> {
                    boolean keywordsChanged = false;
                    if (name != null && !name.trim().isEmpty()) {
                        narrative.setName(name.trim());
                    }
                    if (description != null) {
                        narrative.setDescription(description.trim());
                    }
                    if (keywords != null && !keywords.isEmpty()) {
                        narrative.setKeywords(keywords.toArray(new String[0]));
                        keywordsChanged = true;
                    }
                    if (threatLevel != null && !threatLevel.trim().isEmpty()) {
                        narrative.setThreatLevel(ThreatLevel.valueOf(threatLevel.toUpperCase()));
                    }
                    log.info("Narrative '{}' (id={}) updated", narrative.getName(), id);
                    Narrative saved = narrativeRepository.save(narrative);
                    if (keywordsChanged) {
                        // Refresh junction so newly matching articles surface
                        // immediately. Existing pairs are preserved by ON CONFLICT.
                        populateArticleNarrativesByKeywords(saved);
                    }
                    return toDTO(saved);
                });
    }

    /**
     * Approve a pending narrative, changing status from PENDING_REVIEW to ACTIVE.
     * Optionally updates the title if provided.
     * @param id Narrative ID
     * @param newTitle Optional new title (can be null to keep existing)
     * @return the approved narrative, or empty if not found
     * @throws IllegalStateException if narrative is not in PENDING_REVIEW status
     */
    @Transactional
    public Optional<NarrativeDTO> approve(Long id, String newTitle) {
        return narrativeRepository.findByIdAndOrganizationId(id, getOrgId())
                .map(narrative -> {
                    if (narrative.getStatus() == NarrativeStatus.ACTIVE) {
                        // Already active - idempotent, just return it
                        return toDTO(narrative);
                    }
                    if (narrative.getStatus() != NarrativeStatus.PENDING_REVIEW) {
                        throw new IllegalStateException(
                            "Cannot approve narrative with status " + narrative.getStatus() +
                            ". Only PENDING_REVIEW narratives can be approved.");
                    }
                    narrative.setStatus(NarrativeStatus.ACTIVE);
                    // Update title if provided
                    if (newTitle != null && !newTitle.trim().isEmpty()) {
                        narrative.setName(newTitle.trim());
                    }
                    log.info("Narrative '{}' (id={}) approved and set to ACTIVE", narrative.getName(), id);
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
     * Update article counts for all narratives using the article_narratives junction
     * table with the same relevance filter that the article view endpoint applies.
     * This guarantees the count shown on a narrative card matches the number of
     * articles a user actually sees when opening it. Includes both ACTIVE and
     * PENDING_REVIEW narratives so counts are accurate when analysts review pending
     * narratives. Called periodically by scheduler.
     */
    @Transactional
    public void updateNarrativeCounts() {
        log.info("Updating narrative article counts...");
        Float relevanceThreshold = narrativeRelevanceService.getRelevanceThreshold();

        // Update both ACTIVE and PENDING_REVIEW narratives
        List<Narrative> activeNarratives = narrativeRepository.findByStatus(NarrativeStatus.ACTIVE);
        List<Narrative> pendingNarratives = narrativeRepository.findByStatus(NarrativeStatus.PENDING_REVIEW);

        List<Narrative> allNarratives = new java.util.ArrayList<>(activeNarratives);
        allNarratives.addAll(pendingNarratives);

        for (Narrative narrative : allNarratives) {
            // Count articles linked via the junction table that pass the relevance
            // threshold. This is the same query used by NarrativeController.getNarrativeArticles.
            long count = articleRepository.countByNarrativeIdWithRelevanceThreshold(
                    narrative.getId(), relevanceThreshold);

            int previousCount = narrative.getArticleCount() != null ? narrative.getArticleCount() : 0;
            narrative.setArticleCount((int) count);

            // Update lastSeen if we found new articles
            if (count > previousCount) {
                narrative.setLastSeen(Instant.now());
            }

            narrativeRepository.save(narrative);
            log.debug("Narrative '{}': {} articles (was: {})", narrative.getName(), count, previousCount);
        }

        log.info("Updated {} narrative counts (active: {}, pending: {})",
                allNarratives.size(), activeNarratives.size(), pendingNarratives.size());
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

    /**
     * Populate the article_narratives junction for a narrative by matching its
     * keywords against article titles and content within the backfill window.
     *
     * Inserts pairs with relevance_score=NULL so NarrativeRelevanceService can
     * later refine them via Claude. Idempotent (ON CONFLICT DO NOTHING).
     * Used by create()/update() so user-created narratives get articles
     * immediately, since the scraper only links its own auto-clustered narratives.
     */
    private void populateArticleNarrativesByKeywords(Narrative narrative) {
        String[] keywords = narrative.getKeywords();
        if (keywords == null || keywords.length == 0) {
            return;
        }
        try {
            Instant since = Instant.now().minus(BACKFILL_DAYS, BACKFILL_UNIT);
            int inserted = articleNarrativeRepository.linkArticlesToNarrativeByKeywords(
                    narrative.getId(), keywords, since);
            log.info("Linked {} articles to narrative '{}' (id={}) by keyword match",
                    inserted, narrative.getName(), narrative.getId());
        } catch (Exception e) {
            // Don't fail the create/update if backfill fails — log and move on.
            log.error("Failed to populate article_narratives for narrative {} (id={}): {}",
                    narrative.getName(), narrative.getId(), e.getMessage(), e);
        }
    }

    // ==================== Sharing Methods ====================

    /**
     * Share a narrative with specified users.
     */
    @Transactional
    public NarrativeDTO shareNarrative(Long narrativeId, List<Long> userIds, boolean canEdit) {
        User currentUser = getCurrentUser();
        if (currentUser == null) {
            throw new IllegalStateException("User not authenticated");
        }

        Narrative narrative = narrativeRepository.findByIdAndOrganizationId(narrativeId, getOrgId())
                .orElseThrow(() -> new IllegalArgumentException("Narrative not found"));

        // Check if user is the owner or has edit permission
        if (!canUserModifyNarrative(narrative, currentUser.getId())) {
            throw new IllegalStateException("Only the narrative owner can share it");
        }

        for (Long userId : userIds) {
            // Don't share with self
            if (userId.equals(currentUser.getId())) {
                continue;
            }

            // Check if user exists and is in the same organization
            User targetUser = userRepository.findById(userId)
                    .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

            if (!targetUser.getOrganizationId().equals(getOrgId())) {
                throw new IllegalArgumentException("Cannot share with users outside your organization");
            }

            // Check if already shared
            if (!narrativeShareRepository.existsByNarrativeIdAndSharedWithUserId(narrativeId, userId)) {
                NarrativeShare share = NarrativeShare.builder()
                        .narrative(narrative)
                        .sharedWithUser(targetUser)
                        .sharedByUser(currentUser)
                        .canEdit(canEdit)
                        .build();
                narrativeShareRepository.save(share);
                log.info("Narrative '{}' shared with user '{}'", narrative.getName(), targetUser.getEmail());
            }
        }

        return toDTO(narrative);
    }

    /**
     * Remove sharing of a narrative with a specific user.
     */
    @Transactional
    public void unshareNarrative(Long narrativeId, Long userId) {
        User currentUser = getCurrentUser();
        if (currentUser == null) {
            throw new IllegalStateException("User not authenticated");
        }

        Narrative narrative = narrativeRepository.findByIdAndOrganizationId(narrativeId, getOrgId())
                .orElseThrow(() -> new IllegalArgumentException("Narrative not found"));

        // Check if user is the owner
        if (!canUserModifyNarrative(narrative, currentUser.getId())) {
            throw new IllegalStateException("Only the narrative owner can modify sharing");
        }

        narrativeShareRepository.deleteByNarrativeIdAndSharedWithUserId(narrativeId, userId);
        log.info("Narrative '{}' unshared with user id={}", narrative.getName(), userId);
    }

    /**
     * Get list of users a narrative is shared with.
     */
    @Transactional(readOnly = true)
    public List<SharedUserDTO> getSharedUsers(Long narrativeId) {
        // Verify narrative exists and user has access
        narrativeRepository.findByIdAndOrganizationId(narrativeId, getOrgId())
                .orElseThrow(() -> new IllegalArgumentException("Narrative not found"));

        return narrativeShareRepository.findByNarrativeId(narrativeId).stream()
                .map(share -> new SharedUserDTO(
                        share.getSharedWithUser().getId(),
                        share.getSharedWithUser().getName(),
                        share.getSharedWithUser().getEmail(),
                        share.getCanEdit(),
                        share.getCreatedAt()
                ))
                .toList();
    }

    /**
     * Check if a user can modify a narrative (is owner or has edit permission).
     */
    private boolean canUserModifyNarrative(Narrative narrative, Long userId) {
        // Owner can always modify
        if (narrative.getCreatedBy() != null && narrative.getCreatedBy().getId().equals(userId)) {
            return true;
        }

        // Check if shared with edit permission
        return narrativeShareRepository.findByNarrativeIdAndSharedWithUserId(narrative.getId(), userId)
                .map(NarrativeShare::getCanEdit)
                .orElse(false);
    }

    /**
     * Check if user has access to a narrative (owns it or it's shared with them).
     */
    private boolean canUserAccessNarrative(Narrative narrative, Long userId) {
        // Owner can access
        if (narrative.getCreatedBy() != null && narrative.getCreatedBy().getId().equals(userId)) {
            return true;
        }

        // Check if shared with user
        return narrativeShareRepository.existsByNarrativeIdAndSharedWithUserId(narrative.getId(), userId);
    }

    // ==================== Admin Operations ====================

    /**
     * Reset all auto-generated narratives that are not PENDING_REVIEW back to PENDING_REVIEW.
     * Used when analysts need to re-review previously approved AI-generated narratives.
     */
    @Transactional
    public int resetAutoGeneratedToPending() {
        List<Narrative> narratives = narrativeRepository.findAutoGeneratedNotPendingReview();
        int count = 0;
        for (Narrative narrative : narratives) {
            narrative.setStatus(NarrativeStatus.PENDING_REVIEW);
            narrativeRepository.save(narrative);
            count++;
            log.info("Reset narrative '{}' (id={}) to PENDING_REVIEW", narrative.getName(), narrative.getId());
        }
        log.info("Reset {} auto-generated narratives to PENDING_REVIEW", count);
        return count;
    }

    /**
     * Get counts of auto-generated narratives grouped by status.
     */
    @Transactional(readOnly = true)
    public java.util.Map<String, Long> getAutoGeneratedStatusCounts() {
        java.util.Map<String, Long> counts = new java.util.LinkedHashMap<>();
        for (Object[] row : narrativeRepository.countAutoGeneratedByStatus()) {
            counts.put(((NarrativeStatus) row[0]).name(), (Long) row[1]);
        }
        return counts;
    }

    // ==================== DTO Conversion ====================

    private NarrativeDTO toDTO(Narrative narrative) {
        int alertCount = narrative.getAlerts() != null ? narrative.getAlerts().size() : 0;

        // Get coordination event info for this narrative
        boolean hasCoordination = coordinationEventRepository.hasActiveCoordinationEvents(narrative.getId());
        int coordinationCount = coordinationEventRepository.countByNarrativeId(narrative.getId());

        // Get fact-check info
        int factCheckCount = (int) factCheckRepository.countByNarrativeId(narrative.getId());
        boolean hasFactChecks = factCheckCount > 0;

        // Parse AI summary if present
        AiSummaryDTO aiSummary = null;
        if (narrative.getAiSummary() != null && !narrative.getAiSummary().isEmpty()) {
            try {
                aiSummary = objectMapper.readValue(narrative.getAiSummary(), AiSummaryDTO.class);
            } catch (JsonProcessingException e) {
                log.warn("Failed to parse AI summary for narrative {}: {}", narrative.getId(), e.getMessage());
            }
        }

        // Get creator info
        Long createdById = narrative.getCreatedBy() != null ? narrative.getCreatedBy().getId() : null;
        String createdByName = narrative.getCreatedBy() != null ? narrative.getCreatedBy().getName() : null;

        // Get current user's relationship to this narrative
        Long currentUserId = getCurrentUserId();
        boolean isOwner = createdById != null && createdById.equals(currentUserId);
        boolean isShared = currentUserId != null && !isOwner &&
                narrativeShareRepository.existsByNarrativeIdAndSharedWithUserId(narrative.getId(), currentUserId);
        boolean canEdit = isOwner || (isShared &&
                narrativeShareRepository.findByNarrativeIdAndSharedWithUserId(narrative.getId(), currentUserId)
                        .map(NarrativeShare::getCanEdit)
                        .orElse(false));

        // Get shared users (only for owner)
        List<SharedUserDTO> sharedWith = null;
        if (isOwner) {
            sharedWith = narrativeShareRepository.findByNarrativeId(narrative.getId()).stream()
                    .map(share -> new SharedUserDTO(
                            share.getSharedWithUser().getId(),
                            share.getSharedWithUser().getName(),
                            share.getSharedWithUser().getEmail(),
                            share.getCanEdit(),
                            share.getCreatedAt()
                    ))
                    .toList();
        }

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
                narrative.getCreatedAt(),
                aiSummary,
                createdById,
                createdByName,
                isOwner,
                isShared,
                canEdit,
                sharedWith
        );
    }
}
