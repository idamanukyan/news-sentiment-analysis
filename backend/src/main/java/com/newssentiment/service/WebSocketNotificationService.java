package com.newssentiment.service;

import com.newssentiment.dto.ArticleDTO;
import com.newssentiment.dto.ThreatAlertDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;

/**
 * Service for sending real-time notifications via WebSocket.
 *
 * Topics:
 * - /topic/org/{orgId}/alerts - Alert notifications
 * - /topic/org/{orgId}/articles - Article notifications
 * - /topic/health - System health updates
 * - /topic/org/{orgId}/dashboard - Dashboard stat updates
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WebSocketNotificationService {

    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Notify about a new alert.
     */
    public void notifyNewAlert(Long orgId, ThreatAlertDTO alert) {
        String destination = "/topic/org/" + orgId + "/alerts";
        messagingTemplate.convertAndSend(destination, Map.of(
                "type", "NEW_ALERT",
                "data", alert,
                "timestamp", Instant.now().toString()
        ));
        log.debug("Sent alert notification to {}: {}", destination, alert.title());
    }

    /**
     * Notify about alert status change.
     */
    public void notifyAlertStatusChange(Long orgId, ThreatAlertDTO alert) {
        String destination = "/topic/org/" + orgId + "/alerts";
        messagingTemplate.convertAndSend(destination, Map.of(
                "type", "ALERT_UPDATED",
                "data", alert,
                "timestamp", Instant.now().toString()
        ));
        log.debug("Sent alert update to {}: {} -> {}", destination, alert.id(), alert.status());
    }

    /**
     * Notify about a new article.
     */
    public void notifyNewArticle(Long orgId, ArticleDTO article) {
        String destination = "/topic/org/" + orgId + "/articles";
        messagingTemplate.convertAndSend(destination, Map.of(
                "type", "NEW_ARTICLE",
                "data", article,
                "timestamp", Instant.now().toString()
        ));
        log.debug("Sent article notification to {}: {}", destination, article.title());
    }

    /**
     * Notify about system health changes.
     */
    public void notifyHealthChange(String component, String status, String message) {
        messagingTemplate.convertAndSend("/topic/health", Map.of(
                "type", "HEALTH_UPDATE",
                "component", component,
                "status", status,
                "message", message,
                "timestamp", Instant.now().toString()
        ));
        log.debug("Sent health notification: {} = {} ({})", component, status, message);
    }

    /**
     * Notify about dashboard stats refresh.
     */
    public void notifyDashboardRefresh(Long orgId) {
        String destination = "/topic/org/" + orgId + "/dashboard";
        messagingTemplate.convertAndSend(destination, Map.of(
                "type", "STATS_UPDATED",
                "timestamp", Instant.now().toString()
        ));
        log.debug("Sent dashboard refresh to {}", destination);
    }

    /**
     * Broadcast a message to all connected clients in an organization.
     */
    public void broadcastToOrg(Long orgId, String type, Object data) {
        String destination = "/topic/org/" + orgId + "/broadcast";
        messagingTemplate.convertAndSend(destination, Map.of(
                "type", type,
                "data", data,
                "timestamp", Instant.now().toString()
        ));
    }
}
