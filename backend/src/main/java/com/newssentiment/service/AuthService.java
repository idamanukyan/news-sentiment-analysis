package com.newssentiment.service;

import com.newssentiment.dto.AuthRequest;
import com.newssentiment.dto.AuthResponse;
import com.newssentiment.dto.RegisterRequest;
import com.newssentiment.model.Organization;
import com.newssentiment.model.User;
import com.newssentiment.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserService userService;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    public AuthResponse register(RegisterRequest request) {
        if (userService.existsByEmail(request.email())) {
            throw new IllegalArgumentException("Email already registered");
        }

        var user = User.builder()
                .email(request.email())
                .passwordHash(passwordEncoder.encode(request.password()))
                .name(request.name())
                .role(User.Role.VIEWER)
                .build();

        userService.save(user);

        var token = jwtService.generateTokenWithOrgClaims(user);
        return buildAuthResponse(user, token);
    }

    public AuthResponse authenticate(AuthRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.email(),
                        request.password()
                )
        );

        var user = userService.findByEmail(request.email());
        user.setLastLogin(Instant.now());
        userService.save(user);

        var token = jwtService.generateTokenWithOrgClaims(user);
        return buildAuthResponse(user, token);
    }

    private AuthResponse buildAuthResponse(User user, String token) {
        Organization org = user.getOrganization();
        return new AuthResponse(
                token,
                jwtService.getExpirationTime(),
                user.getEmail(),
                user.getName(),
                user.getRole().name(),
                org != null ? org.getId() : null,
                org != null ? org.getName() : null,
                org != null ? org.getSlug() : null
        );
    }
}
