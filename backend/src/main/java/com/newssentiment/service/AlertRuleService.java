package com.newssentiment.service;

import com.newssentiment.dto.AlertRuleDTO;
import com.newssentiment.dto.AlertRuleRequest;
import com.newssentiment.model.AlertRule;
import com.newssentiment.model.ThreatAlert;
import com.newssentiment.model.User;
import com.newssentiment.repository.AlertRuleRepository;
import com.newssentiment.repository.ArticleRepository;
import com.newssentiment.repository.ThreatAlertRepository;
import com.newssentiment.security.OrganizationContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class AlertRuleService {

    private final AlertRuleRepository ruleRepository;
    private final ArticleRepository articleRepository;
    private final ThreatAlertRepository alertRepository;
    private final SentimentService sentimentService;

    private Long getOrgId() {
        return OrganizationContext.getCurrentOrganizationIdOrNull();
    }

    @Transactional(readOnly = true)
    public List<AlertRuleDTO> findAll() {
        return ruleRepository.findByOrganizationIdOrderByCreatedAtDesc(getOrgId())
                .stream()
                .map(this::toDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AlertRuleDTO> findByUser(Long userId) {
        return ruleRepository.findByOrganizationIdAndCreatedByIdOrderByCreatedAtDesc(getOrgId(), userId)
                .stream()
                .map(this::toDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public Optional<AlertRuleDTO> findById(Long id) {
        return ruleRepository.findByIdAndOrganizationId(id, getOrgId()).map(this::toDTO);
    }

    @Transactional
    public AlertRuleDTO create(AlertRuleRequest request, User user) {
        Map<String, Object> conditions = buildConditionsMap(request.conditions());

        AlertRule rule = AlertRule.builder()
                .organizationId(getOrgId())
                .name(request.name())
                .description(request.description())
                .enabled(true)
                .conditions(conditions)
                .severity(request.severity() != null
                        ? ThreatAlert.Severity.valueOf(request.severity())
                        : ThreatAlert.Severity.MEDIUM)
                .cooldownMinutes(request.cooldownMinutes() != null ? request.cooldownMinutes() : 60)
                .createdBy(user)
                .build();

        log.info("User {} created alert rule: {} for org {}", user.getEmail(), request.name(), getOrgId());
        return toDTO(ruleRepository.save(rule));
    }

    @Transactional
    public Optional<AlertRuleDTO> update(Long id, AlertRuleRequest request) {
        return ruleRepository.findByIdAndOrganizationId(id, getOrgId())
                .map(rule -> {
                    rule.setName(request.name());
                    rule.setDescription(request.description());
                    rule.setConditions(buildConditionsMap(request.conditions()));
                    if (request.severity() != null) {
                        rule.setSeverity(ThreatAlert.Severity.valueOf(request.severity()));
                    }
                    if (request.cooldownMinutes() != null) {
                        rule.setCooldownMinutes(request.cooldownMinutes());
                    }
                    return toDTO(ruleRepository.save(rule));
                });
    }

    @Transactional
    public Optional<AlertRuleDTO> toggleEnabled(Long id) {
        return ruleRepository.findByIdAndOrganizationId(id, getOrgId())
                .map(rule -> {
                    rule.setEnabled(!rule.getEnabled());
                    log.info("Alert rule {} {} ", id, rule.getEnabled() ? "enabled" : "disabled");
                    return toDTO(ruleRepository.save(rule));
                });
    }

    @Transactional
    public void delete(Long id) {
        ruleRepository.findByIdAndOrganizationId(id, getOrgId())
                .ifPresent(rule -> {
                    ruleRepository.delete(rule);
                    log.info("Alert rule {} deleted", id);
                });
    }

    /**
     * Evaluate all enabled rules and create alerts for matching conditions.
     * This is called periodically by the scheduler.
     */
    @Scheduled(fixedRate = 300000) // Every 5 minutes
    @Transactional
    public void evaluateRules() {
        List<AlertRule> enabledRules = ruleRepository.findByEnabledTrue();
        if (enabledRules.isEmpty()) {
            return;
        }

        log.debug("Evaluating {} custom alert rules", enabledRules.size());
        int alertsCreated = 0;

        for (AlertRule rule : enabledRules) {
            if (!rule.canTrigger()) {
                continue;
            }

            try {
                if (evaluateRule(rule)) {
                    createAlertFromRule(rule);
                    rule.recordTrigger();
                    ruleRepository.save(rule);
                    alertsCreated++;
                }
            } catch (Exception e) {
                log.error("Error evaluating rule {}: {}", rule.getId(), e.getMessage());
            }
        }

        if (alertsCreated > 0) {
            log.info("Custom rule evaluation complete. {} alerts created.", alertsCreated);
        }
    }

    private boolean evaluateRule(AlertRule rule) {
        Map<String, Object> conditions = rule.getConditions();
        if (conditions == null || conditions.isEmpty()) {
            return false;
        }

        boolean matchAll = Boolean.TRUE.equals(conditions.get("match_all"));
        List<Boolean> results = new ArrayList<>();

        // Check keywords condition
        if (conditions.containsKey("keywords")) {
            @SuppressWarnings("unchecked")
            List<String> keywords = (List<String>) conditions.get("keywords");
            if (keywords != null && !keywords.isEmpty()) {
                results.add(checkKeywordsCondition(keywords));
            }
        }

        // Check volume threshold condition
        if (conditions.containsKey("volume_threshold")) {
            Integer threshold = toInteger(conditions.get("volume_threshold"));
            Integer timeframeHours = toInteger(conditions.getOrDefault("volume_timeframe_hours", 24));
            if (threshold != null && threshold > 0) {
                results.add(checkVolumeCondition(threshold, timeframeHours));
            }
        }

        // Check sentiment threshold condition
        if (conditions.containsKey("sentiment_threshold")) {
            Integer threshold = toInteger(conditions.get("sentiment_threshold"));
            if (threshold != null && threshold > 0) {
                results.add(checkSentimentCondition(threshold));
            }
        }

        // Check source types condition
        if (conditions.containsKey("source_types")) {
            @SuppressWarnings("unchecked")
            List<String> sourceTypes = (List<String>) conditions.get("source_types");
            if (sourceTypes != null && !sourceTypes.isEmpty()) {
                results.add(checkSourceTypesCondition(sourceTypes));
            }
        }

        if (results.isEmpty()) {
            return false;
        }

        // Combine results: AND (all must match) or OR (any matches)
        if (matchAll) {
            return results.stream().allMatch(Boolean::booleanValue);
        } else {
            return results.stream().anyMatch(Boolean::booleanValue);
        }
    }

    private boolean checkKeywordsCondition(List<String> keywords) {
        Instant since = Instant.now().minus(1, ChronoUnit.HOURS);
        String[] keywordArray = keywords.toArray(new String[0]);
        long count = articleRepository.countByKeywordsSince(keywordArray, since);
        return count > 0;
    }

    private boolean checkVolumeCondition(int threshold, int timeframeHours) {
        Instant since = Instant.now().minus(timeframeHours, ChronoUnit.HOURS);
        long count = articleRepository.countByPublishedAtAfter(since);
        return count >= threshold;
    }

    private boolean checkSentimentCondition(int negativeThreshold) {
        Instant since = Instant.now().minus(24, ChronoUnit.HOURS);
        Map<String, Long> counts = sentimentService.getOverallCounts(since, Instant.now());
        long total = counts.values().stream().mapToLong(Long::longValue).sum();
        if (total == 0) return false;

        long negative = counts.getOrDefault("NEGATIVE", 0L);
        int negativePercent = (int) (negative * 100 / total);
        return negativePercent >= negativeThreshold;
    }

    private boolean checkSourceTypesCondition(List<String> sourceTypes) {
        Instant since = Instant.now().minus(1, ChronoUnit.HOURS);
        for (String type : sourceTypes) {
            long count = articleRepository.countBySourceTypeSince(type, since);
            if (count > 0) {
                return true;
            }
        }
        return false;
    }

    private void createAlertFromRule(AlertRule rule) {
        ThreatAlert alert = ThreatAlert.builder()
                .organizationId(rule.getOrganizationId())
                .rule(rule)
                .alertType(ThreatAlert.AlertType.VOLUME_SPIKE) // Use as generic for custom rules
                .severity(rule.getSeverity())
                .title("Custom rule triggered: " + rule.getName())
                .description(rule.getDescription() != null
                        ? rule.getDescription()
                        : "Alert triggered by custom rule conditions.")
                .status(ThreatAlert.AlertStatus.ACTIVE)
                .metadata(Map.of(
                        "rule_id", rule.getId(),
                        "rule_name", rule.getName(),
                        "conditions", rule.getConditions()
                ))
                .build();

        alertRepository.save(alert);
        log.info("Created alert from custom rule '{}' (severity: {}) for org {}", rule.getName(), rule.getSeverity(), rule.getOrganizationId());
    }

    private Map<String, Object> buildConditionsMap(AlertRuleRequest.AlertConditions conditions) {
        Map<String, Object> map = new HashMap<>();
        if (conditions.keywords() != null && !conditions.keywords().isEmpty()) {
            map.put("keywords", conditions.keywords());
        }
        if (conditions.sentimentThreshold() != null) {
            map.put("sentiment_threshold", conditions.sentimentThreshold());
        }
        if (conditions.volumeThreshold() != null) {
            map.put("volume_threshold", conditions.volumeThreshold());
        }
        if (conditions.volumeTimeframeHours() != null) {
            map.put("volume_timeframe_hours", conditions.volumeTimeframeHours());
        }
        if (conditions.sourceIds() != null && !conditions.sourceIds().isEmpty()) {
            map.put("source_ids", conditions.sourceIds());
        }
        if (conditions.sourceTypes() != null && !conditions.sourceTypes().isEmpty()) {
            map.put("source_types", conditions.sourceTypes());
        }
        if (conditions.matchAll() != null) {
            map.put("match_all", conditions.matchAll());
        }
        return map;
    }

    private Integer toInteger(Object value) {
        if (value == null) return null;
        if (value instanceof Integer) return (Integer) value;
        if (value instanceof Number) return ((Number) value).intValue();
        try {
            return Integer.parseInt(value.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private AlertRuleDTO toDTO(AlertRule rule) {
        return new AlertRuleDTO(
                rule.getId(),
                rule.getName(),
                rule.getDescription(),
                rule.getEnabled(),
                rule.getConditions(),
                rule.getSeverity().name(),
                rule.getCooldownMinutes(),
                rule.getCreatedBy() != null ? rule.getCreatedBy().getEmail() : null,
                rule.getCreatedAt(),
                rule.getUpdatedAt(),
                rule.getLastTriggeredAt(),
                rule.getTriggerCount()
        );
    }
}
