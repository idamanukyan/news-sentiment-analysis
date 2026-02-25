package com.newssentiment.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.newssentiment.dto.ThreatAlertDTO;
import com.newssentiment.model.ThreatAlert.AlertType;
import com.newssentiment.model.ThreatAlert.Severity;
import com.newssentiment.security.JwtService;
import com.newssentiment.service.ThreatAlertService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ThreatAlertController.class)
@DisplayName("ThreatAlertController Tests")
@AutoConfigureMockMvc(addFilters = false) // Disable security filters for unit testing controller logic
class ThreatAlertControllerTest {

    @MockBean
    private JwtService jwtService;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ThreatAlertService alertService;

    private ThreatAlertDTO createTestAlertDTO(Long id, String status) {
        return new ThreatAlertDTO(
                id,
                1L,
                "Test Narrative",
                AlertType.VOLUME_SPIKE.name(),
                Severity.HIGH.name(),
                "Test Alert " + id,
                "Test description",
                Instant.now(),
                status.equals("ACKNOWLEDGED") ? Instant.now() : null,
                null,
                status.equals("RESOLVED") ? Instant.now() : null,
                null,
                status,
                Map.of(),
                Instant.now(),
                null,
                null,
                0,
                null,
                1,
                Instant.now()
        );
    }

    @Nested
    @DisplayName("POST /api/v1/alerts/bulk/acknowledge - P0 BUG AREA")
    class BulkAcknowledgeTests {

        @Test
        @DisplayName("Should bulk acknowledge alerts when authenticated as ANALYST")
        @WithMockUser(roles = "ANALYST")
        void shouldBulkAcknowledgeWhenAuthenticatedAsAnalyst() throws Exception {
            List<Long> alertIds = Arrays.asList(1L, 2L);
            String requestBody = """
                {
                    "alertIds": [1, 2]
                }
                """;

            when(alertService.bulkAcknowledge(eq(alertIds), isNull())).thenReturn(2);

            mockMvc.perform(post("/api/v1/alerts/bulk/acknowledge")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(requestBody))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success", is(true)))
                    .andExpect(jsonPath("$.acknowledged", is(2)))
                    .andExpect(jsonPath("$.requested", is(2)));
        }

        @Test
        @DisplayName("Should bulk acknowledge alerts when authenticated as ORG_ADMIN")
        @WithMockUser(roles = "ORG_ADMIN")
        void shouldBulkAcknowledgeWhenAuthenticatedAsOrgAdmin() throws Exception {
            String requestBody = """
                {
                    "alertIds": [1]
                }
                """;

            when(alertService.bulkAcknowledge(anyList(), isNull())).thenReturn(1);

            mockMvc.perform(post("/api/v1/alerts/bulk/acknowledge")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(requestBody))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success", is(true)));
        }

        @Test
        @DisplayName("Should bulk acknowledge alerts when authenticated as SUPER_ADMIN")
        @WithMockUser(roles = "SUPER_ADMIN")
        void shouldBulkAcknowledgeWhenAuthenticatedAsSuperAdmin() throws Exception {
            String requestBody = """
                {
                    "alertIds": [1, 2, 3]
                }
                """;

            when(alertService.bulkAcknowledge(anyList(), isNull())).thenReturn(3);

            mockMvc.perform(post("/api/v1/alerts/bulk/acknowledge")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(requestBody))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.acknowledged", is(3)));
        }

        // NOTE: Authentication/Authorization tests (401/403) are tested in integration tests
        // with full security configuration. These unit tests focus on controller logic.

        @Test
        @DisplayName("Should return 400 when alertIds is empty - P0 BUG SCENARIO")
        @WithMockUser(roles = "ANALYST")
        void shouldReturn400WhenAlertIdsIsEmpty() throws Exception {
            String requestBody = """
                {
                    "alertIds": []
                }
                """;

            mockMvc.perform(post("/api/v1/alerts/bulk/acknowledge")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(requestBody))
                    .andExpect(status().isBadRequest());

            verify(alertService, never()).bulkAcknowledge(anyList(), anyLong());
        }

        @Test
        @DisplayName("Should return 400 when alertIds is missing")
        @WithMockUser(roles = "ANALYST")
        void shouldReturn400WhenAlertIdsIsMissing() throws Exception {
            String requestBody = """
                {
                }
                """;

            mockMvc.perform(post("/api/v1/alerts/bulk/acknowledge")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(requestBody))
                    .andExpect(status().isBadRequest());
        }

        // NOTE: Empty body and invalid JSON tests are handled at integration level
        // because MockMvc with disabled filters handles errors differently

        @Test
        @DisplayName("Should pass userId when provided")
        @WithMockUser(roles = "ANALYST")
        void shouldPassUserIdWhenProvided() throws Exception {
            String requestBody = """
                {
                    "alertIds": [1]
                }
                """;

            when(alertService.bulkAcknowledge(anyList(), eq(5L))).thenReturn(1);

            mockMvc.perform(post("/api/v1/alerts/bulk/acknowledge")
                            .param("userId", "5")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(requestBody))
                    .andExpect(status().isOk());

            verify(alertService).bulkAcknowledge(anyList(), eq(5L));
        }

        @Test
        @DisplayName("Should handle large batch of alert IDs")
        @WithMockUser(roles = "ANALYST")
        void shouldHandleLargeBatchOfAlertIds() throws Exception {
            // Generate 100 alert IDs
            StringBuilder alertIdsJson = new StringBuilder("[");
            for (int i = 1; i <= 100; i++) {
                if (i > 1) alertIdsJson.append(",");
                alertIdsJson.append(i);
            }
            alertIdsJson.append("]");

            String requestBody = String.format("{\"alertIds\": %s}", alertIdsJson);

            when(alertService.bulkAcknowledge(anyList(), isNull())).thenReturn(100);

            mockMvc.perform(post("/api/v1/alerts/bulk/acknowledge")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(requestBody))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.acknowledged", is(100)))
                    .andExpect(jsonPath("$.requested", is(100)));
        }

        @Test
        @DisplayName("Should return correct count when some alerts are already acknowledged")
        @WithMockUser(roles = "ANALYST")
        void shouldReturnCorrectCountWhenSomeAlertsAlreadyAcknowledged() throws Exception {
            String requestBody = """
                {
                    "alertIds": [1, 2, 3, 4]
                }
                """;

            // Only 2 of 4 alerts are actually acknowledged (rest were already acknowledged or resolved)
            when(alertService.bulkAcknowledge(anyList(), isNull())).thenReturn(2);

            mockMvc.perform(post("/api/v1/alerts/bulk/acknowledge")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(requestBody))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.acknowledged", is(2)))
                    .andExpect(jsonPath("$.requested", is(4)));
        }
    }

    @Nested
    @DisplayName("POST /api/v1/alerts/bulk/resolve")
    class BulkResolveTests {

        @Test
        @DisplayName("Should bulk resolve alerts when authenticated")
        @WithMockUser(roles = "ANALYST")
        void shouldBulkResolveWhenAuthenticated() throws Exception {
            String requestBody = """
                {
                    "alertIds": [1, 2]
                }
                """;

            when(alertService.bulkResolve(anyList(), isNull())).thenReturn(2);

            mockMvc.perform(post("/api/v1/alerts/bulk/resolve")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(requestBody))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success", is(true)))
                    .andExpect(jsonPath("$.resolved", is(2)));
        }

        // NOTE: Authorization tests (403) are covered in integration tests

        @Test
        @DisplayName("Should return 400 for empty alertIds")
        @WithMockUser(roles = "ANALYST")
        void shouldReturn400ForEmptyAlertIds() throws Exception {
            String requestBody = """
                {
                    "alertIds": []
                }
                """;

            mockMvc.perform(post("/api/v1/alerts/bulk/resolve")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(requestBody))
                    .andExpect(status().isBadRequest());
        }
    }

    @Nested
    @DisplayName("POST /api/v1/alerts/bulk/dismiss")
    class BulkDismissTests {

        @Test
        @DisplayName("Should bulk dismiss alerts when authenticated")
        @WithMockUser(roles = "ANALYST")
        void shouldBulkDismissWhenAuthenticated() throws Exception {
            String requestBody = """
                {
                    "alertIds": [1, 2, 3]
                }
                """;

            when(alertService.bulkDismiss(anyList())).thenReturn(3);

            mockMvc.perform(post("/api/v1/alerts/bulk/dismiss")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(requestBody))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success", is(true)))
                    .andExpect(jsonPath("$.dismissed", is(3)));
        }

        // NOTE: Authorization tests (403) are covered in integration tests
    }

    @Nested
    @DisplayName("Single alert operations")
    class SingleAlertOperationTests {

        @Test
        @DisplayName("Should acknowledge single alert")
        @WithMockUser(roles = "ANALYST")
        void shouldAcknowledgeSingleAlert() throws Exception {
            ThreatAlertDTO acknowledgedAlert = createTestAlertDTO(1L, "ACKNOWLEDGED");
            when(alertService.acknowledge(eq(1L), isNull())).thenReturn(Optional.of(acknowledgedAlert));

            mockMvc.perform(post("/api/v1/alerts/1/acknowledge").with(csrf()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status", is("ACKNOWLEDGED")));
        }

        @Test
        @DisplayName("Should return 404 for non-existent alert")
        @WithMockUser(roles = "ANALYST")
        void shouldReturn404ForNonExistentAlert() throws Exception {
            when(alertService.acknowledge(eq(999L), isNull())).thenReturn(Optional.empty());

            mockMvc.perform(post("/api/v1/alerts/999/acknowledge").with(csrf()))
                    .andExpect(status().isNotFound());
        }

        @Test
        @DisplayName("Should resolve single alert")
        @WithMockUser(roles = "ANALYST")
        void shouldResolveSingleAlert() throws Exception {
            ThreatAlertDTO resolvedAlert = createTestAlertDTO(1L, "RESOLVED");
            when(alertService.resolve(eq(1L), isNull())).thenReturn(Optional.of(resolvedAlert));

            mockMvc.perform(post("/api/v1/alerts/1/resolve").with(csrf()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status", is("RESOLVED")));
        }

        @Test
        @DisplayName("Should dismiss single alert")
        @WithMockUser(roles = "ANALYST")
        void shouldDismissSingleAlert() throws Exception {
            ThreatAlertDTO dismissedAlert = createTestAlertDTO(1L, "DISMISSED");
            when(alertService.dismiss(1L)).thenReturn(Optional.of(dismissedAlert));

            mockMvc.perform(post("/api/v1/alerts/1/dismiss").with(csrf()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status", is("DISMISSED")));
        }
    }

    @Nested
    @DisplayName("GET /api/v1/alerts")
    class GetAlertsTests {

        @Test
        @DisplayName("Should get alert stats")
        void shouldGetAlertStats() throws Exception {
            when(alertService.countActive()).thenReturn(5L);
            when(alertService.countBySeverity(any())).thenReturn(1L);

            mockMvc.perform(get("/api/v1/alerts/stats"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.active", is(5)));
        }
    }
}
