package com.newssentiment.service;

import com.newssentiment.dto.CoordinationEventDTO;
import com.newssentiment.model.CoordinationEvent;
import com.newssentiment.model.CoordinationEvent.EventStatus;
import com.newssentiment.model.User;
import com.newssentiment.repository.CoordinationEventRepository;
import com.newssentiment.repository.UserRepository;
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
public class CoordinationEventService {

    private final CoordinationEventRepository eventRepository;
    private final UserRepository userRepository;

    private Long getOrgId() {
        return OrganizationContext.getCurrentOrganizationIdOrNull();
    }

    @Transactional(readOnly = true)
    public Page<CoordinationEventDTO> findAll(Pageable pageable) {
        Long orgId = getOrgId();
        if (orgId != null) {
            return eventRepository.findByOrganizationIdOrderByDetectedAtDesc(orgId, pageable)
                    .map(this::toDTO);
        }
        return eventRepository.findAll(pageable).map(this::toDTO);
    }

    @Transactional(readOnly = true)
    public Optional<CoordinationEventDTO> findById(Long id) {
        Long orgId = getOrgId();
        if (orgId != null) {
            return eventRepository.findByIdAndOrganizationId(id, orgId).map(this::toDTO);
        }
        return eventRepository.findById(id).map(this::toDTO);
    }

    @Transactional(readOnly = true)
    public List<CoordinationEventDTO> findByNarrativeId(Long narrativeId) {
        Long orgId = getOrgId();
        if (orgId != null) {
            return eventRepository.findByOrganizationIdAndNarrativeIdOrderByDetectedAtDesc(orgId, narrativeId)
                    .stream()
                    .map(this::toDTO)
                    .toList();
        }
        return eventRepository.findByNarrativeId(narrativeId).stream()
                .map(this::toDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CoordinationEventDTO> findActive() {
        Long orgId = getOrgId();
        if (orgId != null) {
            return eventRepository.findByOrganizationIdAndStatusOrderByDetectedAtDesc(orgId, EventStatus.ACTIVE)
                    .stream()
                    .map(this::toDTO)
                    .toList();
        }
        return eventRepository.findByStatusOrderByDetectedAtDesc(EventStatus.ACTIVE)
                .stream()
                .map(this::toDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CoordinationEventDTO> findRecent(int days) {
        Instant since = Instant.now().minus(days, ChronoUnit.DAYS);
        Long orgId = getOrgId();
        if (orgId != null) {
            return eventRepository.findByOrganizationIdAndDetectedAtAfter(orgId, since)
                    .stream()
                    .map(this::toDTO)
                    .toList();
        }
        return eventRepository.findByDetectedAtAfter(since).stream()
                .map(this::toDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public long countActive() {
        Long orgId = getOrgId();
        if (orgId != null) {
            return eventRepository.countByOrganizationIdAndStatus(orgId, EventStatus.ACTIVE);
        }
        return eventRepository.countByStatus(EventStatus.ACTIVE);
    }

    @Transactional(readOnly = true)
    public long countRecent(int days) {
        Instant since = Instant.now().minus(days, ChronoUnit.DAYS);
        Long orgId = getOrgId();
        if (orgId != null) {
            return eventRepository.countByOrganizationIdAndDetectedAtAfter(orgId, since);
        }
        return eventRepository.countByDetectedAtAfter(since);
    }

    @Transactional(readOnly = true)
    public boolean hasActiveCoordinationForNarrative(Long narrativeId) {
        return eventRepository.hasActiveCoordinationEvents(narrativeId);
    }

    @Transactional
    public Optional<CoordinationEventDTO> markAsReviewed(Long id, Long userId) {
        Long orgId = getOrgId();
        Optional<CoordinationEvent> eventOpt = orgId != null
                ? eventRepository.findByIdAndOrganizationId(id, orgId)
                : eventRepository.findById(id);

        return eventOpt.map(event -> {
            event.setStatus(EventStatus.REVIEWED);
            event.setReviewedAt(Instant.now());
            if (userId != null) {
                userRepository.findById(userId).ifPresent(event::setReviewedBy);
            }
            log.info("Coordination event {} marked as reviewed by user {}", id, userId);
            return toDTO(eventRepository.save(event));
        });
    }

    @Transactional
    public Optional<CoordinationEventDTO> dismiss(Long id, Long userId) {
        Long orgId = getOrgId();
        Optional<CoordinationEvent> eventOpt = orgId != null
                ? eventRepository.findByIdAndOrganizationId(id, orgId)
                : eventRepository.findById(id);

        return eventOpt.map(event -> {
            event.setStatus(EventStatus.DISMISSED);
            event.setReviewedAt(Instant.now());
            if (userId != null) {
                userRepository.findById(userId).ifPresent(event::setReviewedBy);
            }
            log.info("Coordination event {} dismissed by user {}", id, userId);
            return toDTO(eventRepository.save(event));
        });
    }

    private CoordinationEventDTO toDTO(CoordinationEvent event) {
        return new CoordinationEventDTO(
                event.getId(),
                event.getNarrative() != null ? event.getNarrative().getId() : null,
                event.getNarrative() != null ? event.getNarrative().getName() : null,
                event.getDetectedAt(),
                event.getTimeWindowHours(),
                event.getSourceCount(),
                event.getArticleCount(),
                event.getSimilarityScore(),
                event.getCoordinationType().name(),
                event.getDescription(),
                event.getSourcesInvolved(),
                event.getArticleIds(),
                event.getStatus().name(),
                event.getReviewedAt(),
                event.getReviewedBy() != null ? event.getReviewedBy().getName() : null,
                event.getCreatedAt()
        );
    }
}
