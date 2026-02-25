package com.newssentiment.controller;

import com.newssentiment.dto.FactCheckCreateRequest;
import com.newssentiment.dto.FactCheckDTO;
import com.newssentiment.model.FactCheck;
import com.newssentiment.model.Narrative;
import com.newssentiment.repository.FactCheckRepository;
import com.newssentiment.repository.NarrativeRepository;
import com.newssentiment.security.OrganizationContext;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Slf4j
public class FactCheckController {

    private final FactCheckRepository factCheckRepository;
    private final NarrativeRepository narrativeRepository;

    /**
     * Get all fact-checks for a narrative
     */
    @GetMapping("/narratives/{narrativeId}/fact-checks")
    public ResponseEntity<List<FactCheckDTO>> getFactChecksForNarrative(@PathVariable Long narrativeId) {
        Long orgId = OrganizationContext.getCurrentOrganizationIdOrNull();

        List<FactCheck> factChecks;
        if (orgId != null) {
            factChecks = factCheckRepository.findByNarrativeIdAndOrganizationIdOrderByAddedAtDesc(narrativeId, orgId);
        } else {
            factChecks = factCheckRepository.findByNarrativeIdOrderByAddedAtDesc(narrativeId);
        }

        List<FactCheckDTO> dtos = factChecks.stream()
                .map(FactCheckDTO::fromEntity)
                .toList();

        return ResponseEntity.ok(dtos);
    }

    /**
     * Add a fact-check link to a narrative
     */
    @PostMapping("/narratives/{narrativeId}/fact-checks")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ORG_ADMIN', 'ANALYST')")
    public ResponseEntity<FactCheckDTO> addFactCheck(
            @PathVariable Long narrativeId,
            @Valid @RequestBody FactCheckCreateRequest request) {

        Long orgId = OrganizationContext.getCurrentOrganizationIdOrNull();
        if (orgId == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        // Find the narrative
        Narrative narrative = narrativeRepository.findByIdAndOrganizationId(narrativeId, orgId)
                .orElse(null);

        if (narrative == null) {
            return ResponseEntity.notFound().build();
        }

        // Get current user email
        String addedBy = getCurrentUserEmail();

        // Parse verdict if provided
        FactCheck.Verdict verdict = null;
        if (request.verdict() != null && !request.verdict().isBlank()) {
            try {
                verdict = FactCheck.Verdict.valueOf(request.verdict().toUpperCase());
            } catch (IllegalArgumentException e) {
                // Invalid verdict, leave as null
            }
        }

        FactCheck factCheck = FactCheck.builder()
                .narrative(narrative)
                .organizationId(orgId)
                .title(request.title())
                .url(request.url())
                .publisher(request.publisher() != null ? request.publisher() : "CivilNet")
                .verdict(verdict)
                .publishedAt(request.publishedAt())
                .addedAt(Instant.now())
                .addedBy(addedBy)
                .notes(request.notes())
                .build();

        FactCheck saved = factCheckRepository.save(factCheck);
        log.info("Added fact-check '{}' to narrative {} by {}", saved.getTitle(), narrativeId, addedBy);

        return ResponseEntity.status(HttpStatus.CREATED).body(FactCheckDTO.fromEntity(saved));
    }

    /**
     * Delete a fact-check
     */
    @DeleteMapping("/fact-checks/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ORG_ADMIN', 'ANALYST')")
    public ResponseEntity<Void> deleteFactCheck(@PathVariable Long id) {
        Long orgId = OrganizationContext.getCurrentOrganizationIdOrNull();
        if (orgId == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return factCheckRepository.findByIdAndOrganizationId(id, orgId)
                .map(fc -> {
                    factCheckRepository.delete(fc);
                    log.info("Deleted fact-check {} from narrative {}", id, fc.getNarrative().getId());
                    return ResponseEntity.noContent().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }

    private String getCurrentUserEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getName() != null) {
            return auth.getName();
        }
        return "unknown";
    }
}
