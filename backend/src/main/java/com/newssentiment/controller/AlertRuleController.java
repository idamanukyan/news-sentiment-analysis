package com.newssentiment.controller;

import com.newssentiment.dto.AlertRuleDTO;
import com.newssentiment.dto.AlertRuleRequest;
import com.newssentiment.model.User;
import com.newssentiment.service.AlertRuleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/alert-rules")
@RequiredArgsConstructor
public class AlertRuleController {

    private final AlertRuleService ruleService;

    @GetMapping
    public ResponseEntity<List<AlertRuleDTO>> getAll() {
        return ResponseEntity.ok(ruleService.findAll());
    }

    @GetMapping("/mine")
    public ResponseEntity<List<AlertRuleDTO>> getMyRules(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ruleService.findByUser(user.getId()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<AlertRuleDTO> getById(@PathVariable Long id) {
        return ruleService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<AlertRuleDTO> create(
            @Valid @RequestBody AlertRuleRequest request,
            @AuthenticationPrincipal User user) {
        AlertRuleDTO rule = ruleService.create(request, user);
        return ResponseEntity.status(HttpStatus.CREATED).body(rule);
    }

    @PutMapping("/{id}")
    public ResponseEntity<AlertRuleDTO> update(
            @PathVariable Long id,
            @Valid @RequestBody AlertRuleRequest request) {
        return ruleService.update(id, request)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/toggle")
    public ResponseEntity<AlertRuleDTO> toggleEnabled(@PathVariable Long id) {
        return ruleService.toggleEnabled(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        ruleService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/evaluate")
    public ResponseEntity<Map<String, String>> evaluateNow() {
        ruleService.evaluateRules();
        return ResponseEntity.ok(Map.of("status", "evaluation triggered"));
    }
}
