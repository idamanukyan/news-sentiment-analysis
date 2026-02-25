package com.newssentiment.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.newssentiment.dto.NarrativeCreateRequest;
import com.newssentiment.dto.NarrativeDTO;
import com.newssentiment.repository.ArticleRepository;
import com.newssentiment.security.JwtService;
import com.newssentiment.service.NarrativeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(NarrativeController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("NarrativeController Tests")
class NarrativeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private NarrativeService narrativeService;

    @MockBean
    private ArticleRepository articleRepository;

    private NarrativeDTO testNarrativeDTO;

    @BeforeEach
    void setUp() {
        testNarrativeDTO = new NarrativeDTO(
                1L,
                "Election Fraud Claims",
                "Claims about election fraud",
                List.of("fraud", "rigged"),
                "ACTIVE",
                "HIGH",
                Instant.now().minusSeconds(86400),
                Instant.now(),
                10,
                2,
                false,
                0,
                0,
                false,
                Instant.now().minusSeconds(86400)
        );
    }

    @Nested
    @DisplayName("GET /api/v1/narratives")
    class GetAllNarrativesTests {

        @Test
        @DisplayName("Should return narratives for authenticated user")
        void shouldReturnNarrativesForAuthenticatedUser() throws Exception {
            Page<NarrativeDTO> page = new PageImpl<>(List.of(testNarrativeDTO));
            when(narrativeService.findAll(any(Pageable.class))).thenReturn(page);

            mockMvc.perform(get("/api/v1/narratives"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content[0].name").value("Election Fraud Claims"))
                    .andExpect(jsonPath("$.content[0].threatLevel").value("HIGH"));
        }
    }

    @Nested
    @DisplayName("GET /api/v1/narratives/{id}")
    class GetNarrativeByIdTests {

        @Test
        @DisplayName("Should return narrative by id")
        void shouldReturnNarrativeById() throws Exception {
            when(narrativeService.findById(1L)).thenReturn(Optional.of(testNarrativeDTO));

            mockMvc.perform(get("/api/v1/narratives/1"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.name").value("Election Fraud Claims"));
        }

        @Test
        @DisplayName("Should return 404 when narrative not found")
        void shouldReturn404WhenNotFound() throws Exception {
            when(narrativeService.findById(999L)).thenReturn(Optional.empty());

            mockMvc.perform(get("/api/v1/narratives/999"))
                    .andExpect(status().isNotFound());
        }
    }

    @Nested
    @DisplayName("POST /api/v1/narratives")
    class CreateNarrativeTests {

        @Test
        @DisplayName("Should create narrative")
        void shouldCreateNarrative() throws Exception {
            NarrativeCreateRequest request = new NarrativeCreateRequest(
                    "New Narrative",
                    "Description",
                    List.of("keyword1", "keyword2"),
                    "MEDIUM"
            );

            when(narrativeService.create(any(NarrativeCreateRequest.class))).thenReturn(testNarrativeDTO);

            mockMvc.perform(post("/api/v1/narratives")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.name").value("Election Fraud Claims"));
        }

        @Test
        @DisplayName("Should return 400 for invalid request")
        void shouldReturn400ForInvalidRequest() throws Exception {
            String invalidRequest = """
                {
                    "description": "Missing name field"
                }
                """;

            mockMvc.perform(post("/api/v1/narratives")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(invalidRequest))
                    .andExpect(status().isBadRequest());
        }
    }

    @Nested
    @DisplayName("DELETE /api/v1/narratives/{id}")
    class DeleteNarrativeTests {

        @Test
        @DisplayName("Should delete narrative")
        void shouldDeleteNarrative() throws Exception {
            doNothing().when(narrativeService).delete(1L);

            mockMvc.perform(delete("/api/v1/narratives/1"))
                    .andExpect(status().isNoContent());

            verify(narrativeService).delete(1L);
        }
    }

    @Nested
    @DisplayName("GET /api/v1/narratives/active")
    class GetActiveNarrativesTests {

        @Test
        @DisplayName("Should return active narratives")
        void shouldReturnActiveNarratives() throws Exception {
            when(narrativeService.findActive()).thenReturn(List.of(testNarrativeDTO));

            mockMvc.perform(get("/api/v1/narratives/active"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].status").value("ACTIVE"));
        }
    }
}
