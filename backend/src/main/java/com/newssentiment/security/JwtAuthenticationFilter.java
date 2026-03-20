package com.newssentiment.security;

import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        final String authHeader = request.getHeader("Authorization");
        final String jwt;
        final String userEmail;

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        jwt = authHeader.substring(7);

        try {
            userEmail = jwtService.extractUsername(jwt);

            if (userEmail != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                UserDetails userDetails = this.userDetailsService.loadUserByUsername(userEmail);

                if (jwtService.isTokenValid(jwt, userDetails)) {
                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            userDetails,
                            null,
                            userDetails.getAuthorities()
                    );
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);

                    // Set organization context from JWT claims
                    Long orgId = jwtService.extractOrganizationId(jwt);
                    String orgSlug = jwtService.extractOrganizationSlug(jwt);
                    String orgName = jwtService.extractOrganizationName(jwt);
                    if (orgId != null) {
                        OrganizationContext.setCurrentOrganization(orgId, orgSlug, orgName);
                    }
                } else {
                    // Token is invalid (likely expired based on our validation)
                    sendUnauthorizedResponse(response, "Session expired. Please log in again.");
                    return;
                }
            }
        } catch (ExpiredJwtException e) {
            logger.debug("JWT token has expired", e);
            sendUnauthorizedResponse(response, "Session expired. Please log in again.");
            return;
        } catch (JwtException e) {
            logger.debug("Invalid JWT token", e);
            sendUnauthorizedResponse(response, "Invalid session. Please log in again.");
            return;
        } catch (Exception e) {
            logger.error("Cannot set user authentication", e);
            sendUnauthorizedResponse(response, "Authentication failed. Please log in again.");
            return;
        }

        try {
            filterChain.doFilter(request, response);
        } finally {
            // Always clear organization context after request completes
            OrganizationContext.clear();
        }
    }

    private void sendUnauthorizedResponse(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write("{\"error\": \"" + message + "\", \"code\": \"SESSION_EXPIRED\"}");
    }
}
