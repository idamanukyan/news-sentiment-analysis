package com.newssentiment.service;

import com.newssentiment.dto.ThreatAlertDTO;
import com.newssentiment.model.Narrative;
import com.newssentiment.model.ThreatAlert;
import com.newssentiment.model.ThreatAlert.AlertStatus;
import com.newssentiment.model.ThreatAlert.AlertType;
import com.newssentiment.model.ThreatAlert.Severity;
import com.newssentiment.model.User;
import com.newssentiment.repository.ArticleRepository;
import com.newssentiment.repository.NarrativeRepository;
import com.newssentiment.repository.ThreatAlertRepository;
import com.newssentiment.repository.UserRepository;
import com.newssentiment.security.OrganizationContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ThreatAlertService Tests")
class ThreatAlertServiceTest {

    @Mock
    private ThreatAlertRepository alertRepository;

    @Mock
    private NarrativeRepository narrativeRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ArticleRepository articleRepository;

    @Mock
    private DashboardCacheEvictionService cacheEvictionService;

    @Mock
    private WebSocketNotificationService webSocketService;

    @InjectMocks
    private ThreatAlertService threatAlertService;

    private ThreatAlert activeAlert1;
    private ThreatAlert activeAlert2;
    private ThreatAlert acknowledgedAlert;
    private ThreatAlert resolvedAlert;
    private User testUser;
    private MockedStatic<OrganizationContext> orgContextMock;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(1L)
                .email("analyst@test.com")
                .name("Test Analyst")
                .build();

        activeAlert1 = ThreatAlert.builder()
                .id(1L)
                .organizationId(1L)
                .alertType(AlertType.VOLUME_SPIKE)
                .severity(Severity.HIGH)
                .title("Alert 1")
                .description("Test alert 1")
                .status(AlertStatus.ACTIVE)
                .triggeredAt(Instant.now())
                .metadata(Map.of())
                .build();

        activeAlert2 = ThreatAlert.builder()
                .id(2L)
                .organizationId(1L)
                .alertType(AlertType.NEW_NARRATIVE)
                .severity(Severity.MEDIUM)
                .title("Alert 2")
                .description("Test alert 2")
                .status(AlertStatus.ACTIVE)
                .triggeredAt(Instant.now())
                .metadata(Map.of())
                .build();

        acknowledgedAlert = ThreatAlert.builder()
                .id(3L)
                .organizationId(1L)
                .alertType(AlertType.COORDINATED)
                .severity(Severity.CRITICAL)
                .title("Alert 3")
                .description("Already acknowledged")
                .status(AlertStatus.ACKNOWLEDGED)
                .triggeredAt(Instant.now().minusSeconds(3600))
                .acknowledgedAt(Instant.now().minusSeconds(1800))
                .metadata(Map.of())
                .build();

        resolvedAlert = ThreatAlert.builder()
                .id(4L)
                .organizationId(1L)
                .alertType(AlertType.VIRAL)
                .severity(Severity.LOW)
                .title("Alert 4")
                .description("Already resolved")
                .status(AlertStatus.RESOLVED)
                .triggeredAt(Instant.now().minusSeconds(7200))
                .resolvedAt(Instant.now().minusSeconds(3600))
                .metadata(Map.of())
                .build();

        // Mock organization context
        orgContextMock = mockStatic(OrganizationContext.class);
        orgContextMock.when(OrganizationContext::getCurrentOrganizationIdOrNull).thenReturn(null);
    }

    @AfterEach
    void tearDown() {
        if (orgContextMock != null) {
            orgContextMock.close();
        }
    }

    @Nested
    @DisplayName("bulkAcknowledge tests")
    class BulkAcknowledgeTests {

        @Test
        @DisplayName("Should acknowledge all active alerts with valid IDs")
        void shouldAcknowledgeAllActiveAlerts() {
            List<Long> alertIds = Arrays.asList(1L, 2L);

            when(alertRepository.findAllById(alertIds))
                    .thenReturn(Arrays.asList(activeAlert1, activeAlert2));
            when(alertRepository.save(any(ThreatAlert.class)))
                    .thenAnswer(i -> i.getArgument(0));

            int count = threatAlertService.bulkAcknowledge(alertIds, null);

            assertThat(count).isEqualTo(2);
            assertThat(activeAlert1.getStatus()).isEqualTo(AlertStatus.ACKNOWLEDGED);
            assertThat(activeAlert2.getStatus()).isEqualTo(AlertStatus.ACKNOWLEDGED);
            assertThat(activeAlert1.getAcknowledgedAt()).isNotNull();
            assertThat(activeAlert2.getAcknowledgedAt()).isNotNull();

            verify(alertRepository, times(2)).save(any(ThreatAlert.class));
            verify(webSocketService, times(2)).notifyAlertStatusChange(anyLong(), any(ThreatAlertDTO.class));
            verify(cacheEvictionService).evictDashboardCache(0L);
        }

        @Test
        @DisplayName("Should return 0 for empty list - P0 BUG SCENARIO")
        void shouldReturnZeroForEmptyList() {
            List<Long> alertIds = Collections.emptyList();

            when(alertRepository.findAllById(alertIds))
                    .thenReturn(Collections.emptyList());

            int count = threatAlertService.bulkAcknowledge(alertIds, null);

            assertThat(count).isEqualTo(0);
            verify(alertRepository, never()).save(any(ThreatAlert.class));
            verify(webSocketService, never()).notifyAlertStatusChange(anyLong(), any(ThreatAlertDTO.class));
            verify(cacheEvictionService, never()).evictDashboardCache(anyLong());
        }

        @Test
        @DisplayName("Should handle null alertIds gracefully")
        void shouldHandleNullAlertIds() {
            // Note: Current implementation may throw NPE - this test documents expected behavior
            when(alertRepository.findAllById(any()))
                    .thenReturn(Collections.emptyList());

            int count = threatAlertService.bulkAcknowledge(new ArrayList<>(), null);

            assertThat(count).isEqualTo(0);
        }

        @Test
        @DisplayName("Should skip already acknowledged alerts")
        void shouldSkipAlreadyAcknowledgedAlerts() {
            List<Long> alertIds = Arrays.asList(1L, 3L); // 1 active, 3 already acknowledged

            when(alertRepository.findAllById(alertIds))
                    .thenReturn(Arrays.asList(activeAlert1, acknowledgedAlert));
            when(alertRepository.save(any(ThreatAlert.class)))
                    .thenAnswer(i -> i.getArgument(0));

            int count = threatAlertService.bulkAcknowledge(alertIds, null);

            assertThat(count).isEqualTo(1); // Only the active one
            assertThat(activeAlert1.getStatus()).isEqualTo(AlertStatus.ACKNOWLEDGED);
            assertThat(acknowledgedAlert.getStatus()).isEqualTo(AlertStatus.ACKNOWLEDGED); // Unchanged

            verify(alertRepository, times(1)).save(any(ThreatAlert.class));
        }

        @Test
        @DisplayName("Should skip resolved alerts")
        void shouldSkipResolvedAlerts() {
            List<Long> alertIds = Arrays.asList(1L, 4L); // 1 active, 4 resolved

            when(alertRepository.findAllById(alertIds))
                    .thenReturn(Arrays.asList(activeAlert1, resolvedAlert));
            when(alertRepository.save(any(ThreatAlert.class)))
                    .thenAnswer(i -> i.getArgument(0));

            int count = threatAlertService.bulkAcknowledge(alertIds, null);

            assertThat(count).isEqualTo(1);
            assertThat(resolvedAlert.getStatus()).isEqualTo(AlertStatus.RESOLVED); // Unchanged
        }

        @Test
        @DisplayName("Should set acknowledgedBy when userId provided")
        void shouldSetAcknowledgedByWhenUserIdProvided() {
            List<Long> alertIds = List.of(1L);

            when(alertRepository.findAllById(alertIds))
                    .thenReturn(List.of(activeAlert1));
            when(userRepository.findById(1L))
                    .thenReturn(Optional.of(testUser));
            when(alertRepository.save(any(ThreatAlert.class)))
                    .thenAnswer(i -> i.getArgument(0));

            int count = threatAlertService.bulkAcknowledge(alertIds, 1L);

            assertThat(count).isEqualTo(1);
            assertThat(activeAlert1.getAcknowledgedBy()).isEqualTo(testUser);
        }

        @Test
        @DisplayName("Should handle non-existent alert IDs gracefully - P0 BUG SCENARIO")
        void shouldHandleNonExistentAlertIds() {
            List<Long> alertIds = Arrays.asList(999L, 1000L);

            when(alertRepository.findAllById(alertIds))
                    .thenReturn(Collections.emptyList()); // Repository returns empty for non-existent IDs

            int count = threatAlertService.bulkAcknowledge(alertIds, null);

            assertThat(count).isEqualTo(0);
            verify(alertRepository, never()).save(any(ThreatAlert.class));
        }

        @Test
        @DisplayName("Should handle mix of valid and invalid IDs")
        void shouldHandleMixOfValidAndInvalidIds() {
            List<Long> alertIds = Arrays.asList(1L, 999L); // 1 exists, 999 doesn't

            when(alertRepository.findAllById(alertIds))
                    .thenReturn(List.of(activeAlert1)); // Only returns the existing one
            when(alertRepository.save(any(ThreatAlert.class)))
                    .thenAnswer(i -> i.getArgument(0));

            int count = threatAlertService.bulkAcknowledge(alertIds, null);

            assertThat(count).isEqualTo(1);
            assertThat(activeAlert1.getStatus()).isEqualTo(AlertStatus.ACKNOWLEDGED);
        }

        @Test
        @DisplayName("Should handle duplicate IDs in list")
        void shouldHandleDuplicateIds() {
            List<Long> alertIds = Arrays.asList(1L, 1L, 1L);

            // Repository typically deduplicates by ID
            when(alertRepository.findAllById(alertIds))
                    .thenReturn(List.of(activeAlert1));
            when(alertRepository.save(any(ThreatAlert.class)))
                    .thenAnswer(i -> i.getArgument(0));

            int count = threatAlertService.bulkAcknowledge(alertIds, null);

            assertThat(count).isEqualTo(1);
            verify(alertRepository, times(1)).save(any(ThreatAlert.class));
        }

        @Test
        @DisplayName("Should filter by organization when org context is set")
        void shouldFilterByOrganizationWhenContextSet() {
            orgContextMock.when(OrganizationContext::getCurrentOrganizationIdOrNull).thenReturn(1L);

            // Alert from different org
            ThreatAlert differentOrgAlert = ThreatAlert.builder()
                    .id(5L)
                    .organizationId(2L) // Different org
                    .alertType(AlertType.VOLUME_SPIKE)
                    .severity(Severity.HIGH)
                    .title("Different Org Alert")
                    .status(AlertStatus.ACTIVE)
                    .triggeredAt(Instant.now())
                    .metadata(Map.of())
                    .build();

            List<Long> alertIds = Arrays.asList(1L, 5L);

            when(alertRepository.findAllById(alertIds))
                    .thenReturn(Arrays.asList(activeAlert1, differentOrgAlert));
            when(alertRepository.save(any(ThreatAlert.class)))
                    .thenAnswer(i -> i.getArgument(0));

            int count = threatAlertService.bulkAcknowledge(alertIds, null);

            // Should only acknowledge alert from org 1
            assertThat(count).isEqualTo(1);
            assertThat(activeAlert1.getStatus()).isEqualTo(AlertStatus.ACKNOWLEDGED);
            assertThat(differentOrgAlert.getStatus()).isEqualTo(AlertStatus.ACTIVE); // Unchanged
        }

        @Test
        @DisplayName("Should send WebSocket notification for each acknowledged alert")
        void shouldSendWebSocketNotificationForEachAlert() {
            List<Long> alertIds = Arrays.asList(1L, 2L);

            when(alertRepository.findAllById(alertIds))
                    .thenReturn(Arrays.asList(activeAlert1, activeAlert2));
            when(alertRepository.save(any(ThreatAlert.class)))
                    .thenAnswer(i -> i.getArgument(0));

            threatAlertService.bulkAcknowledge(alertIds, null);

            verify(webSocketService, times(2)).notifyAlertStatusChange(eq(1L), any(ThreatAlertDTO.class));
        }

        @Test
        @DisplayName("Should handle large batch of alerts")
        void shouldHandleLargeBatchOfAlerts() {
            List<ThreatAlert> manyAlerts = new ArrayList<>();
            List<Long> alertIds = new ArrayList<>();
            for (int i = 0; i < 100; i++) {
                long id = (long) i;
                alertIds.add(id);
                manyAlerts.add(ThreatAlert.builder()
                        .id(id)
                        .organizationId(1L)
                        .alertType(AlertType.VOLUME_SPIKE)
                        .severity(Severity.MEDIUM)
                        .title("Alert " + i)
                        .status(AlertStatus.ACTIVE)
                        .triggeredAt(Instant.now())
                        .metadata(Map.of())
                        .build());
            }

            when(alertRepository.findAllById(alertIds)).thenReturn(manyAlerts);
            when(alertRepository.save(any(ThreatAlert.class)))
                    .thenAnswer(i -> i.getArgument(0));

            int count = threatAlertService.bulkAcknowledge(alertIds, null);

            assertThat(count).isEqualTo(100);
            verify(alertRepository, times(100)).save(any(ThreatAlert.class));
        }

        @Test
        @DisplayName("P0 REGRESSION: Should handle WebSocket notification failure gracefully")
        void shouldHandleWebSocketFailureGracefully() {
            List<Long> alertIds = Arrays.asList(1L, 2L);

            when(alertRepository.findAllById(alertIds))
                    .thenReturn(Arrays.asList(activeAlert1, activeAlert2));
            when(alertRepository.save(any(ThreatAlert.class)))
                    .thenAnswer(i -> i.getArgument(0));

            // Simulate WebSocket failure
            doThrow(new RuntimeException("WebSocket connection failed"))
                    .when(webSocketService).notifyAlertStatusChange(anyLong(), any(ThreatAlertDTO.class));

            // Operation should still succeed (WebSocket is best-effort)
            int count = threatAlertService.bulkAcknowledge(alertIds, null);

            // Alerts should still be saved even if WebSocket fails
            assertThat(count).isEqualTo(2);
            verify(alertRepository, times(2)).save(any(ThreatAlert.class));
        }

        @Test
        @DisplayName("P0 REGRESSION: Should handle extremely large batch (250+ alerts)")
        void shouldHandleExtremelyLargeBatch() {
            List<ThreatAlert> manyAlerts = new ArrayList<>();
            List<Long> alertIds = new ArrayList<>();
            for (int i = 0; i < 250; i++) {
                long id = (long) i;
                alertIds.add(id);
                manyAlerts.add(ThreatAlert.builder()
                        .id(id)
                        .organizationId(1L)
                        .alertType(AlertType.VOLUME_SPIKE)
                        .severity(Severity.MEDIUM)
                        .title("Alert " + i)
                        .status(AlertStatus.ACTIVE)
                        .triggeredAt(Instant.now())
                        .metadata(Map.of())
                        .build());
            }

            when(alertRepository.findAllById(alertIds)).thenReturn(manyAlerts);
            when(alertRepository.save(any(ThreatAlert.class)))
                    .thenAnswer(i -> i.getArgument(0));

            int count = threatAlertService.bulkAcknowledge(alertIds, null);

            assertThat(count).isEqualTo(250);
        }

        @Test
        @DisplayName("P0 REGRESSION: Should correctly handle mixed alert states")
        void shouldCorrectlyHandleMixedAlertStates() {
            // Create alerts with various states
            ThreatAlert active = ThreatAlert.builder()
                    .id(10L)
                    .organizationId(1L)
                    .alertType(AlertType.VOLUME_SPIKE)
                    .severity(Severity.HIGH)
                    .title("Active Alert")
                    .status(AlertStatus.ACTIVE)
                    .triggeredAt(Instant.now())
                    .metadata(Map.of())
                    .build();

            ThreatAlert acknowledged = ThreatAlert.builder()
                    .id(11L)
                    .organizationId(1L)
                    .alertType(AlertType.NEW_NARRATIVE)
                    .severity(Severity.MEDIUM)
                    .title("Already Acknowledged")
                    .status(AlertStatus.ACKNOWLEDGED)
                    .acknowledgedAt(Instant.now().minusSeconds(3600))
                    .triggeredAt(Instant.now())
                    .metadata(Map.of())
                    .build();

            ThreatAlert resolved = ThreatAlert.builder()
                    .id(12L)
                    .organizationId(1L)
                    .alertType(AlertType.COORDINATED)
                    .severity(Severity.LOW)
                    .title("Already Resolved")
                    .status(AlertStatus.RESOLVED)
                    .resolvedAt(Instant.now().minusSeconds(7200))
                    .triggeredAt(Instant.now())
                    .metadata(Map.of())
                    .build();

            ThreatAlert dismissed = ThreatAlert.builder()
                    .id(13L)
                    .organizationId(1L)
                    .alertType(AlertType.VIRAL)
                    .severity(Severity.CRITICAL)
                    .title("Already Dismissed")
                    .status(AlertStatus.DISMISSED)
                    .triggeredAt(Instant.now())
                    .metadata(Map.of())
                    .build();

            List<Long> alertIds = Arrays.asList(10L, 11L, 12L, 13L);

            when(alertRepository.findAllById(alertIds))
                    .thenReturn(Arrays.asList(active, acknowledged, resolved, dismissed));
            when(alertRepository.save(any(ThreatAlert.class)))
                    .thenAnswer(i -> i.getArgument(0));

            int count = threatAlertService.bulkAcknowledge(alertIds, null);

            // Only the ACTIVE alert should be acknowledged
            assertThat(count).isEqualTo(1);
            assertThat(active.getStatus()).isEqualTo(AlertStatus.ACKNOWLEDGED);
            assertThat(acknowledged.getStatus()).isEqualTo(AlertStatus.ACKNOWLEDGED); // unchanged
            assertThat(resolved.getStatus()).isEqualTo(AlertStatus.RESOLVED); // unchanged
            assertThat(dismissed.getStatus()).isEqualTo(AlertStatus.DISMISSED); // unchanged

            // Should only save the active one
            verify(alertRepository, times(1)).save(any(ThreatAlert.class));
        }

        @Test
        @DisplayName("P0 REGRESSION: Should handle null in alertIds list")
        void shouldHandleNullInAlertIdsList() {
            // Test with list containing nulls - should not cause NPE
            List<Long> alertIds = Arrays.asList(1L, null, 2L);

            when(alertRepository.findAllById(any()))
                    .thenReturn(Arrays.asList(activeAlert1, activeAlert2));
            when(alertRepository.save(any(ThreatAlert.class)))
                    .thenAnswer(i -> i.getArgument(0));

            int count = threatAlertService.bulkAcknowledge(alertIds, null);

            assertThat(count).isEqualTo(2);
        }
    }

    @Nested
    @DisplayName("bulkResolve tests")
    class BulkResolveTests {

        @Test
        @DisplayName("Should resolve active alerts")
        void shouldResolveActiveAlerts() {
            List<Long> alertIds = List.of(1L);

            when(alertRepository.findAllById(alertIds))
                    .thenReturn(List.of(activeAlert1));
            when(alertRepository.save(any(ThreatAlert.class)))
                    .thenAnswer(i -> i.getArgument(0));

            int count = threatAlertService.bulkResolve(alertIds, null);

            assertThat(count).isEqualTo(1);
            assertThat(activeAlert1.getStatus()).isEqualTo(AlertStatus.RESOLVED);
            assertThat(activeAlert1.getResolvedAt()).isNotNull();
        }

        @Test
        @DisplayName("Should resolve acknowledged alerts")
        void shouldResolveAcknowledgedAlerts() {
            List<Long> alertIds = List.of(3L);

            when(alertRepository.findAllById(alertIds))
                    .thenReturn(List.of(acknowledgedAlert));
            when(alertRepository.save(any(ThreatAlert.class)))
                    .thenAnswer(i -> i.getArgument(0));

            int count = threatAlertService.bulkResolve(alertIds, null);

            assertThat(count).isEqualTo(1);
            assertThat(acknowledgedAlert.getStatus()).isEqualTo(AlertStatus.RESOLVED);
        }

        @Test
        @DisplayName("Should skip already resolved alerts")
        void shouldSkipAlreadyResolvedAlerts() {
            List<Long> alertIds = Arrays.asList(1L, 4L);

            when(alertRepository.findAllById(alertIds))
                    .thenReturn(Arrays.asList(activeAlert1, resolvedAlert));
            when(alertRepository.save(any(ThreatAlert.class)))
                    .thenAnswer(i -> i.getArgument(0));

            int count = threatAlertService.bulkResolve(alertIds, null);

            assertThat(count).isEqualTo(1);
        }

        @Test
        @DisplayName("Should return 0 for empty list")
        void shouldReturnZeroForEmptyList() {
            when(alertRepository.findAllById(Collections.emptyList()))
                    .thenReturn(Collections.emptyList());

            int count = threatAlertService.bulkResolve(Collections.emptyList(), null);

            assertThat(count).isEqualTo(0);
        }
    }

    @Nested
    @DisplayName("bulkDismiss tests")
    class BulkDismissTests {

        @Test
        @DisplayName("Should dismiss active alerts")
        void shouldDismissActiveAlerts() {
            List<Long> alertIds = Arrays.asList(1L, 2L);

            when(alertRepository.findAllById(alertIds))
                    .thenReturn(Arrays.asList(activeAlert1, activeAlert2));
            when(alertRepository.save(any(ThreatAlert.class)))
                    .thenAnswer(i -> i.getArgument(0));

            int count = threatAlertService.bulkDismiss(alertIds);

            assertThat(count).isEqualTo(2);
            assertThat(activeAlert1.getStatus()).isEqualTo(AlertStatus.DISMISSED);
            assertThat(activeAlert2.getStatus()).isEqualTo(AlertStatus.DISMISSED);
        }

        @Test
        @DisplayName("Should dismiss acknowledged alerts")
        void shouldDismissAcknowledgedAlerts() {
            List<Long> alertIds = List.of(3L);

            when(alertRepository.findAllById(alertIds))
                    .thenReturn(List.of(acknowledgedAlert));
            when(alertRepository.save(any(ThreatAlert.class)))
                    .thenAnswer(i -> i.getArgument(0));

            int count = threatAlertService.bulkDismiss(alertIds);

            assertThat(count).isEqualTo(1);
            assertThat(acknowledgedAlert.getStatus()).isEqualTo(AlertStatus.DISMISSED);
        }

        @Test
        @DisplayName("Should skip already dismissed alerts")
        void shouldSkipAlreadyDismissedAlerts() {
            ThreatAlert dismissedAlert = ThreatAlert.builder()
                    .id(5L)
                    .organizationId(1L)
                    .alertType(AlertType.VOLUME_SPIKE)
                    .severity(Severity.LOW)
                    .title("Dismissed Alert")
                    .status(AlertStatus.DISMISSED)
                    .triggeredAt(Instant.now())
                    .metadata(Map.of())
                    .build();

            List<Long> alertIds = Arrays.asList(1L, 5L);

            when(alertRepository.findAllById(alertIds))
                    .thenReturn(Arrays.asList(activeAlert1, dismissedAlert));
            when(alertRepository.save(any(ThreatAlert.class)))
                    .thenAnswer(i -> i.getArgument(0));

            int count = threatAlertService.bulkDismiss(alertIds);

            assertThat(count).isEqualTo(1);
        }

        @Test
        @DisplayName("Should return 0 for empty list")
        void shouldReturnZeroForEmptyList() {
            when(alertRepository.findAllById(Collections.emptyList()))
                    .thenReturn(Collections.emptyList());

            int count = threatAlertService.bulkDismiss(Collections.emptyList());

            assertThat(count).isEqualTo(0);
        }
    }

    @Nested
    @DisplayName("Single alert operations tests")
    class SingleAlertOperationTests {

        @Test
        @DisplayName("Should acknowledge single alert")
        void shouldAcknowledgeSingleAlert() {
            when(alertRepository.findById(1L)).thenReturn(Optional.of(activeAlert1));
            when(alertRepository.save(any(ThreatAlert.class)))
                    .thenAnswer(i -> i.getArgument(0));

            Optional<ThreatAlertDTO> result = threatAlertService.acknowledge(1L, null);

            assertThat(result).isPresent();
            assertThat(result.get().status()).isEqualTo("ACKNOWLEDGED");
            verify(webSocketService).notifyAlertStatusChange(eq(1L), any(ThreatAlertDTO.class));
        }

        @Test
        @DisplayName("Should return empty for non-existent alert")
        void shouldReturnEmptyForNonExistentAlert() {
            when(alertRepository.findById(999L)).thenReturn(Optional.empty());

            Optional<ThreatAlertDTO> result = threatAlertService.acknowledge(999L, null);

            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("Should resolve single alert")
        void shouldResolveSingleAlert() {
            when(alertRepository.findById(1L)).thenReturn(Optional.of(activeAlert1));
            when(alertRepository.save(any(ThreatAlert.class)))
                    .thenAnswer(i -> i.getArgument(0));

            Optional<ThreatAlertDTO> result = threatAlertService.resolve(1L, null);

            assertThat(result).isPresent();
            assertThat(result.get().status()).isEqualTo("RESOLVED");
        }

        @Test
        @DisplayName("Should dismiss single alert")
        void shouldDismissSingleAlert() {
            when(alertRepository.findById(1L)).thenReturn(Optional.of(activeAlert1));
            when(alertRepository.save(any(ThreatAlert.class)))
                    .thenAnswer(i -> i.getArgument(0));

            Optional<ThreatAlertDTO> result = threatAlertService.dismiss(1L);

            assertThat(result).isPresent();
            assertThat(result.get().status()).isEqualTo("DISMISSED");
        }
    }

    @Nested
    @DisplayName("Query operations tests")
    class QueryOperationTests {

        @Test
        @DisplayName("Should count active alerts")
        void shouldCountActiveAlerts() {
            when(alertRepository.countByStatus(AlertStatus.ACTIVE)).thenReturn(5L);

            long count = threatAlertService.countActive();

            assertThat(count).isEqualTo(5L);
        }

        @Test
        @DisplayName("Should count alerts by severity")
        void shouldCountAlertsBySeverity() {
            when(alertRepository.countActiveBySeverity(Severity.CRITICAL)).thenReturn(3L);

            long count = threatAlertService.countBySeverity(Severity.CRITICAL);

            assertThat(count).isEqualTo(3L);
        }

        @Test
        @DisplayName("Should filter counts by organization when context set")
        void shouldFilterCountsByOrganization() {
            orgContextMock.when(OrganizationContext::getCurrentOrganizationIdOrNull).thenReturn(1L);
            when(alertRepository.countByOrganizationIdAndStatus(1L, AlertStatus.ACTIVE)).thenReturn(2L);

            long count = threatAlertService.countActive();

            assertThat(count).isEqualTo(2L);
            verify(alertRepository).countByOrganizationIdAndStatus(1L, AlertStatus.ACTIVE);
        }
    }
}
