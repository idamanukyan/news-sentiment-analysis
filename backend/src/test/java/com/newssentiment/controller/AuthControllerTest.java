package com.newssentiment.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.newssentiment.dto.AuthRequest;
import com.newssentiment.dto.AuthResponse;
import com.newssentiment.security.JwtService;
import com.newssentiment.service.AuthService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("AuthController Tests")
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthService authService;

    @MockBean
    private JwtService jwtService;

    @Nested
    @DisplayName("POST /api/v1/auth/login")
    class LoginTests {

        @Test
        @DisplayName("Should login successfully with valid credentials")
        void shouldLoginSuccessfully() throws Exception {
            AuthRequest request = new AuthRequest("admin@aiim.am", "password123");
            AuthResponse response = new AuthResponse("jwt-token", 86400000L, "admin@aiim.am", "Admin", "ORG_ADMIN", 1L, "AIIM Default", "aiim-default");

            when(authService.authenticate(any(AuthRequest.class))).thenReturn(response);

            mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.token").value("jwt-token"))
                    .andExpect(jsonPath("$.email").value("admin@aiim.am"))
                    .andExpect(jsonPath("$.role").value("ORG_ADMIN"));
        }

        @Test
        @DisplayName("Should return 400 for missing email")
        void shouldReturn400ForMissingEmail() throws Exception {
            String invalidRequest = """
                {
                    "password": "password123"
                }
                """;

            mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(invalidRequest))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("Should return 400 for missing password")
        void shouldReturn400ForMissingPassword() throws Exception {
            String invalidRequest = """
                {
                    "email": "admin@aiim.am"
                }
                """;

            mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(invalidRequest))
                    .andExpect(status().isBadRequest());
        }
    }
}
