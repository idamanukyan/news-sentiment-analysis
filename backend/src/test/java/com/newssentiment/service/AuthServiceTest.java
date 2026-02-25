package com.newssentiment.service;

import com.newssentiment.dto.AuthRequest;
import com.newssentiment.dto.AuthResponse;
import com.newssentiment.dto.RegisterRequest;
import com.newssentiment.model.User;
import com.newssentiment.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuthService Tests")
class AuthServiceTest {

    @Mock
    private UserService userService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @Mock
    private AuthenticationManager authenticationManager;

    @InjectMocks
    private AuthService authService;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(1L)
                .email("test@aiim.am")
                .passwordHash("hashedPassword")
                .name("Test User")
                .role(User.Role.VIEWER)
                .build();
    }

    @Nested
    @DisplayName("register tests")
    class RegisterTests {

        @Test
        @DisplayName("Should register new user successfully")
        void shouldRegisterNewUser() {
            RegisterRequest request = new RegisterRequest("newuser@aiim.am", "password123", "New User");

            when(userService.existsByEmail("newuser@aiim.am")).thenReturn(false);
            when(passwordEncoder.encode("password123")).thenReturn("encodedPassword");
            when(jwtService.generateTokenWithOrgClaims(any(User.class))).thenReturn("jwt-token");
            when(jwtService.getExpirationTime()).thenReturn(86400000L);

            AuthResponse response = authService.register(request);

            assertThat(response.token()).isEqualTo("jwt-token");
            assertThat(response.email()).isEqualTo("newuser@aiim.am");
            assertThat(response.name()).isEqualTo("New User");
            assertThat(response.role()).isEqualTo("VIEWER");

            ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
            verify(userService).save(userCaptor.capture());

            User savedUser = userCaptor.getValue();
            assertThat(savedUser.getEmail()).isEqualTo("newuser@aiim.am");
            assertThat(savedUser.getPasswordHash()).isEqualTo("encodedPassword");
            assertThat(savedUser.getRole()).isEqualTo(User.Role.VIEWER);
        }

        @Test
        @DisplayName("Should throw exception when email already exists")
        void shouldThrowExceptionWhenEmailExists() {
            RegisterRequest request = new RegisterRequest("existing@aiim.am", "password123", "User");

            when(userService.existsByEmail("existing@aiim.am")).thenReturn(true);

            assertThatThrownBy(() -> authService.register(request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessage("Email already registered");

            verify(userService, never()).save(any());
        }
    }

    @Nested
    @DisplayName("authenticate tests")
    class AuthenticateTests {

        @Test
        @DisplayName("Should authenticate valid credentials")
        void shouldAuthenticateValidCredentials() {
            AuthRequest request = new AuthRequest("test@aiim.am", "password123");

            when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                    .thenReturn(new UsernamePasswordAuthenticationToken(testUser, null));
            when(userService.findByEmail("test@aiim.am")).thenReturn(testUser);
            when(jwtService.generateTokenWithOrgClaims(testUser)).thenReturn("jwt-token");
            when(jwtService.getExpirationTime()).thenReturn(86400000L);

            AuthResponse response = authService.authenticate(request);

            assertThat(response.token()).isEqualTo("jwt-token");
            assertThat(response.email()).isEqualTo("test@aiim.am");
            assertThat(response.name()).isEqualTo("Test User");
            assertThat(response.role()).isEqualTo("VIEWER");

            verify(userService).save(testUser);
            assertThat(testUser.getLastLogin()).isNotNull();
        }

        @Test
        @DisplayName("Should throw exception for invalid credentials")
        void shouldThrowExceptionForInvalidCredentials() {
            AuthRequest request = new AuthRequest("test@aiim.am", "wrongpassword");

            when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                    .thenThrow(new BadCredentialsException("Invalid credentials"));

            assertThatThrownBy(() -> authService.authenticate(request))
                    .isInstanceOf(BadCredentialsException.class);

            verify(userService, never()).findByEmail(any());
        }
    }
}
