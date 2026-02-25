package com.newssentiment.controller;

import com.newssentiment.dto.CoordinationEventDTO;
import com.newssentiment.service.CoordinationEventService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/coordination-events")
@RequiredArgsConstructor
public class CoordinationEventController {

    private final CoordinationEventService eventService;

    @GetMapping
    public ResponseEntity<Page<CoordinationEventDTO>> getAllEvents(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(eventService.findAll(pageable));
    }

    @GetMapping("/active")
    public ResponseEntity<List<CoordinationEventDTO>> getActiveEvents() {
        return ResponseEntity.ok(eventService.findActive());
    }

    @GetMapping("/recent")
    public ResponseEntity<List<CoordinationEventDTO>> getRecentEvents(
            @RequestParam(defaultValue = "7") int days) {
        return ResponseEntity.ok(eventService.findRecent(days));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CoordinationEventDTO> getEvent(@PathVariable Long id) {
        return eventService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/narrative/{narrativeId}")
    public ResponseEntity<List<CoordinationEventDTO>> getEventsByNarrative(
            @PathVariable Long narrativeId) {
        return ResponseEntity.ok(eventService.findByNarrativeId(narrativeId));
    }

    @PostMapping("/{id}/review")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ORG_ADMIN', 'ANALYST')")
    public ResponseEntity<CoordinationEventDTO> markAsReviewed(
            @PathVariable Long id,
            @RequestParam(required = false) Long userId) {
        return eventService.markAsReviewed(id, userId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/dismiss")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ORG_ADMIN', 'ANALYST')")
    public ResponseEntity<CoordinationEventDTO> dismissEvent(
            @PathVariable Long id,
            @RequestParam(required = false) Long userId) {
        return eventService.dismiss(id, userId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        return ResponseEntity.ok(Map.of(
                "activeCount", eventService.countActive(),
                "last7DaysCount", eventService.countRecent(7),
                "last30DaysCount", eventService.countRecent(30)
        ));
    }
}
