package com.newssentiment.controller;

import com.newssentiment.dto.BulkAlertRequest;
import com.newssentiment.dto.ThreatAlertCreateRequest;
import com.newssentiment.dto.ThreatAlertDTO;
import com.newssentiment.model.ThreatAlert.AlertStatus;
import com.newssentiment.model.ThreatAlert.AlertType;
import com.newssentiment.model.ThreatAlert.Severity;
import com.newssentiment.service.ThreatAlertService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/alerts")
@RequiredArgsConstructor
public class ThreatAlertController {

    private final ThreatAlertService alertService;

    @GetMapping
    public ResponseEntity<Page<ThreatAlertDTO>> getAllAlerts(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String severity,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) Long narrativeId,
            @PageableDefault(size = 20) Pageable pageable) {

        AlertStatus alertStatus = status != null ? AlertStatus.valueOf(status.toUpperCase()) : null;
        Severity alertSeverity = severity != null ? Severity.valueOf(severity.toUpperCase()) : null;
        AlertType alertType = type != null ? AlertType.valueOf(type.toUpperCase()) : null;

        return ResponseEntity.ok(alertService.findWithFilters(
                alertStatus, alertSeverity, alertType, narrativeId, pageable));
    }

    @GetMapping("/active")
    public ResponseEntity<List<ThreatAlertDTO>> getActiveAlerts() {
        return ResponseEntity.ok(alertService.findActive());
    }

    @GetMapping("/urgent")
    public ResponseEntity<List<ThreatAlertDTO>> getUrgentAlerts() {
        return ResponseEntity.ok(alertService.findUrgent());
    }

    @GetMapping("/recent")
    public ResponseEntity<List<ThreatAlertDTO>> getRecentAlerts(
            @RequestParam(defaultValue = "24") int hours) {
        return ResponseEntity.ok(alertService.findRecent(hours));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ThreatAlertDTO> getAlert(@PathVariable Long id) {
        return alertService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ORG_ADMIN', 'ANALYST')")
    public ResponseEntity<ThreatAlertDTO> createAlert(
            @Valid @RequestBody ThreatAlertCreateRequest request) {
        ThreatAlertDTO created = alertService.createAlert(
                request.narrativeId(),
                AlertType.valueOf(request.alertType().toUpperCase()),
                Severity.valueOf(request.severity().toUpperCase()),
                request.title(),
                request.description(),
                request.metadata()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PostMapping("/{id}/acknowledge")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ORG_ADMIN', 'ANALYST')")
    public ResponseEntity<ThreatAlertDTO> acknowledgeAlert(
            @PathVariable Long id,
            @RequestParam(required = false) Long userId) {
        return alertService.acknowledge(id, userId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/resolve")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ORG_ADMIN', 'ANALYST')")
    public ResponseEntity<ThreatAlertDTO> resolveAlert(
            @PathVariable Long id,
            @RequestParam(required = false) Long userId) {
        return alertService.resolve(id, userId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/dismiss")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ORG_ADMIN', 'ANALYST')")
    public ResponseEntity<ThreatAlertDTO> dismissAlert(@PathVariable Long id) {
        return alertService.dismiss(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/assign")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ORG_ADMIN', 'ANALYST')")
    public ResponseEntity<ThreatAlertDTO> assignAlert(
            @PathVariable Long id,
            @RequestParam String assignedTo,
            @RequestParam(required = false) Integer priority) {
        return alertService.assignAlert(id, assignedTo, priority)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/notes")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ORG_ADMIN', 'ANALYST')")
    public ResponseEntity<ThreatAlertDTO> updateNotes(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String notes = body.get("notes");
        return alertService.updateNotes(id, notes)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/assigned/{assignedTo}")
    public ResponseEntity<Page<ThreatAlertDTO>> getAlertsByAssignee(
            @PathVariable String assignedTo,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(alertService.findByAssignedTo(assignedTo, pageable));
    }

    @GetMapping("/unassigned")
    public ResponseEntity<Page<ThreatAlertDTO>> getUnassignedAlerts(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(alertService.findUnassigned(pageable));
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Long>> getAlertStats() {
        return ResponseEntity.ok(Map.of(
                "active", alertService.countActive(),
                "critical", alertService.countBySeverity(Severity.CRITICAL),
                "high", alertService.countBySeverity(Severity.HIGH),
                "medium", alertService.countBySeverity(Severity.MEDIUM),
                "low", alertService.countBySeverity(Severity.LOW)
        ));
    }

    // ===== BULK OPERATIONS =====

    @PostMapping("/bulk/acknowledge")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ORG_ADMIN', 'ANALYST')")
    public ResponseEntity<Map<String, Object>> bulkAcknowledge(
            @Valid @RequestBody BulkAlertRequest request,
            @RequestParam(required = false) Long userId) {
        int count = alertService.bulkAcknowledge(request.alertIds(), userId);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "acknowledged", count,
                "requested", request.alertIds().size()
        ));
    }

    @PostMapping("/bulk/resolve")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ORG_ADMIN', 'ANALYST')")
    public ResponseEntity<Map<String, Object>> bulkResolve(
            @Valid @RequestBody BulkAlertRequest request,
            @RequestParam(required = false) Long userId) {
        int count = alertService.bulkResolve(request.alertIds(), userId);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "resolved", count,
                "requested", request.alertIds().size()
        ));
    }

    @PostMapping("/bulk/dismiss")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ORG_ADMIN', 'ANALYST')")
    public ResponseEntity<Map<String, Object>> bulkDismiss(
            @Valid @RequestBody BulkAlertRequest request) {
        int count = alertService.bulkDismiss(request.alertIds());
        return ResponseEntity.ok(Map.of(
                "success", true,
                "dismissed", count,
                "requested", request.alertIds().size()
        ));
    }
}
