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
import java.time.temporal.ChronoUnit;
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
    private final CoordinationEventRepository coordinationEventRepository;
    private final FactCheckRepository factCheckRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

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

    /**
     * Update a narrative's properties (name, description, keywords, threat level).
     * Only updates fields that are provided (non-null).
     */
    @Transactional
    public Optional<NarrativeDTO> update(Long id, String name, String description,
                                          java.util.List<String> keywords, String threatLevel) {
        return narrativeRepository.findByIdAndOrganizationId(id, getOrgId())
                .map(narrative -> {
                    if (name != null && !name.trim().isEmpty()) {
                        narrative.setName(name.trim());
                    }
                    if (description != null) {
                        narrative.setDescription(description.trim());
                    }
                    if (keywords != null && !keywords.isEmpty()) {
                        narrative.setKeywords(keywords.toArray(new String[0]));
                    }
                    if (threatLevel != null && !threatLevel.trim().isEmpty()) {
                        narrative.setThreatLevel(ThreatLevel.valueOf(threatLevel.toUpperCase()));
                    }
                    log.info("Narrative '{}' (id={}) updated", narrative.getName(), id);
                    return toDTO(narrativeRepository.save(narrative));
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
     * Update article counts for all narratives based on keyword matches.
     * Includes both ACTIVE and PENDING_REVIEW narratives so counts are
     * accurate when analysts review pending narratives.
     * Called periodically by scheduler.
     */
    @Transactional
    public void updateNarrativeCounts() {
        log.info("Updating narrative article counts...");
        // Use 30-day window to match the article view endpoint
        Instant since = Instant.now().minus(30, ChronoUnit.DAYS);

        // Update both ACTIVE and PENDING_REVIEW narratives
        List<Narrative> activeNarratives = narrativeRepository.findByStatus(NarrativeStatus.ACTIVE);
        List<Narrative> pendingNarratives = narrativeRepository.findByStatus(NarrativeStatus.PENDING_REVIEW);

        List<Narrative> allNarratives = new java.util.ArrayList<>(activeNarratives);
        allNarratives.addAll(pendingNarratives);

        for (Narrative narrative : allNarratives) {
            String[] keywords = narrative.getKeywords();
            if (keywords == null || keywords.length == 0) {
                continue;
            }

            // Expand multi-word keywords to match article view logic
            // "Syunik concessions" becomes ["Syunik concessions", "Syunik", "concessions"]
            List<String> expandedKeywords = new java.util.ArrayList<>();
            for (String keyword : keywords) {
                expandedKeywords.add(keyword);
                if (keyword.contains(" ")) {
                    for (String word : keyword.split("\\s+")) {
                        if (word.length() >= 3 && !expandedKeywords.contains(word)) {
                            expandedKeywords.add(word);
                        }
                    }
                }
            }

            // Count articles matching keywords in the last 30 days
            long count = articleRepository.countByKeywordsSince(expandedKeywords.toArray(new String[0]), since);

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
