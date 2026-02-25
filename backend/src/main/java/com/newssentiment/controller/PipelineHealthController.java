package com.newssentiment.controller;

import com.newssentiment.dto.PipelineHealthDTO;
import com.newssentiment.service.PipelineHealthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/health")
@RequiredArgsConstructor
@Tag(name = "Pipeline Health", description = "Monitoring endpoints for pipeline health")
public class PipelineHealthController {

    private final PipelineHealthService pipelineHealthService;

    @GetMapping("/pipeline")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ORG_ADMIN', 'ANALYST')")
    @Operation(summary = "Get pipeline health status",
               description = "Returns comprehensive health metrics for the data pipeline including ingestion, translation, sentiment analysis, and source status")
    public ResponseEntity<PipelineHealthDTO> getPipelineHealth() {
        return ResponseEntity.ok(pipelineHealthService.getHealth());
    }
}
