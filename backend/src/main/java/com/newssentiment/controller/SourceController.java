package com.newssentiment.controller;

import com.newssentiment.dto.SourceCreateRequest;
import com.newssentiment.dto.SourceDTO;
import com.newssentiment.model.Source;
import com.newssentiment.service.SourceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/sources")
@RequiredArgsConstructor
public class SourceController {

    private final SourceService sourceService;

    @GetMapping
    public ResponseEntity<List<SourceDTO>> getSources(
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String language,
            @RequestParam(required = false) Boolean active
    ) {
        List<SourceDTO> sources;

        if (active != null && active) {
            sources = sourceService.findActive();
        } else if (type != null) {
            sources = sourceService.findByType(Source.SourceType.valueOf(type.toUpperCase()));
        } else if (language != null) {
            sources = sourceService.findByLanguage(Source.Language.valueOf(language.toUpperCase()));
        } else {
            sources = sourceService.findAll();
        }

        return ResponseEntity.ok(sources);
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        return ResponseEntity.ok(sourceService.getStats());
    }

    @GetMapping("/{id}")
    public ResponseEntity<SourceDTO> getSource(@PathVariable Long id) {
        return sourceService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<SourceDTO> createSource(@Valid @RequestBody SourceCreateRequest request) {
        try {
            SourceDTO created = sourceService.create(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<SourceDTO> updateSource(
            @PathVariable Long id,
            @Valid @RequestBody SourceCreateRequest request
    ) {
        return sourceService.update(id, request)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/toggle")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<SourceDTO> toggleSourceActive(@PathVariable Long id) {
        return sourceService.toggleActive(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ORG_ADMIN')")
    public ResponseEntity<Void> deleteSource(@PathVariable Long id) {
        sourceService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/types")
    public ResponseEntity<List<String>> getSourceTypes() {
        return ResponseEntity.ok(List.of("RSS", "WEB_SCRAPE", "TELEGRAM"));
    }

    @GetMapping("/languages")
    public ResponseEntity<List<String>> getLanguages() {
        return ResponseEntity.ok(List.of("ARMENIAN", "RUSSIAN", "ENGLISH"));
    }
}
