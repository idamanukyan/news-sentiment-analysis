package com.newssentiment.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Rate limiting configuration for API endpoints.
 * Uses in-memory Bucket4j for simplicity. For distributed deployments,
 * consider using Redis-backed buckets.
 */
@Configuration
@Slf4j
public class RateLimitingConfig {

    // IP-based buckets for unauthenticated requests
    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    // Default limits: 100 requests per minute for API endpoints
    private static final int DEFAULT_CAPACITY = 100;
    private static final int REFILL_TOKENS = 100;
    private static final Duration REFILL_DURATION = Duration.ofMinutes(1);

    // Stricter limits for auth endpoints: 10 requests per minute
    private static final int AUTH_CAPACITY = 10;
    private static final int AUTH_REFILL_TOKENS = 10;

    // Search endpoints: 30 requests per minute
    private static final int SEARCH_CAPACITY = 30;
    private static final int SEARCH_REFILL_TOKENS = 30;

    @Bean
    public FilterRegistrationBean<RateLimitFilter> rateLimitFilter() {
        FilterRegistrationBean<RateLimitFilter> registration = new FilterRegistrationBean<>();
        registration.setFilter(new RateLimitFilter());
        registration.addUrlPatterns("/api/*");
        registration.setOrder(1);
        return registration;
    }

    private class RateLimitFilter extends OncePerRequestFilter {

        @Override
        protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                       FilterChain filterChain) throws ServletException, IOException {

            String clientIp = getClientIP(request);
            String path = request.getRequestURI();

            // Determine rate limit tier based on endpoint
            Bucket bucket = resolveBucket(clientIp, path);

            if (bucket.tryConsume(1)) {
                // Add rate limit headers
                response.addHeader("X-Rate-Limit-Remaining", String.valueOf(bucket.getAvailableTokens()));
                filterChain.doFilter(request, response);
            } else {
                log.warn("Rate limit exceeded for IP: {} on path: {}", clientIp, path);
                response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                response.setContentType("application/json");
                response.getWriter().write("{\"error\":\"Rate limit exceeded. Please try again later.\",\"retryAfter\":60}");
            }
        }

        private String getClientIP(HttpServletRequest request) {
            String xForwardedFor = request.getHeader("X-Forwarded-For");
            if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
                return xForwardedFor.split(",")[0].trim();
            }
            return request.getRemoteAddr();
        }

        private Bucket resolveBucket(String clientIp, String path) {
            String key;
            int capacity;
            int refillTokens;

            if (path.contains("/auth/")) {
                // Stricter limits for authentication endpoints
                key = "auth:" + clientIp;
                capacity = AUTH_CAPACITY;
                refillTokens = AUTH_REFILL_TOKENS;
            } else if (path.contains("/search")) {
                // Moderate limits for search endpoints
                key = "search:" + clientIp;
                capacity = SEARCH_CAPACITY;
                refillTokens = SEARCH_REFILL_TOKENS;
            } else {
                // Default limits for other API endpoints
                key = "api:" + clientIp;
                capacity = DEFAULT_CAPACITY;
                refillTokens = REFILL_TOKENS;
            }

            return buckets.computeIfAbsent(key, k -> createBucket(capacity, refillTokens));
        }

        private Bucket createBucket(int capacity, int refillTokens) {
            Bandwidth limit = Bandwidth.classic(capacity,
                    Refill.greedy(refillTokens, REFILL_DURATION));
            return Bucket.builder()
                    .addLimit(limit)
                    .build();
        }
    }
}
