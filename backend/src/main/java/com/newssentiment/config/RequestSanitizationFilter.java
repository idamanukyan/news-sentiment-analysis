package com.newssentiment.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.regex.Pattern;

/**
 * Request sanitization filter to prevent XSS and injection attacks.
 * Sanitizes query parameters and validates input patterns.
 */
@Configuration
@Slf4j
public class RequestSanitizationFilter {

    // Pattern to detect potential XSS attacks
    private static final Pattern XSS_PATTERN = Pattern.compile(
            "(<script[^>]*>.*?</script>)|" +
            "(<[^>]+(on\\w+\\s*=)[^>]*>)|" +
            "(javascript\\s*:)|" +
            "(vbscript\\s*:)|" +
            "(data\\s*:)|" +
            "(<iframe[^>]*>)|" +
            "(<object[^>]*>)|" +
            "(<embed[^>]*>)",
            Pattern.CASE_INSENSITIVE | Pattern.DOTALL
    );

    // Pattern to detect SQL injection attempts
    private static final Pattern SQL_INJECTION_PATTERN = Pattern.compile(
            "(\\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\\b.*\\b(FROM|INTO|SET|TABLE|DATABASE)\\b)|" +
            "(--)|" +
            "(;\\s*$)|" +
            "(\\b(OR|AND)\\b\\s+\\d+\\s*=\\s*\\d+)",
            Pattern.CASE_INSENSITIVE
    );

    // Maximum length for query parameters
    private static final int MAX_PARAM_LENGTH = 2000;

    @Bean
    public FilterRegistrationBean<SanitizationFilter> sanitizationFilter() {
        FilterRegistrationBean<SanitizationFilter> registration = new FilterRegistrationBean<>();
        registration.setFilter(new SanitizationFilter());
        registration.addUrlPatterns("/api/*");
        registration.setOrder(0); // Run before rate limiting
        return registration;
    }

    private class SanitizationFilter extends OncePerRequestFilter {

        @Override
        protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                       FilterChain filterChain) throws ServletException, IOException {

            // Wrap request to sanitize parameters
            SanitizedRequestWrapper wrappedRequest = new SanitizedRequestWrapper(request);

            // Check for suspicious patterns in query string
            String queryString = request.getQueryString();
            if (queryString != null) {
                if (containsMaliciousContent(queryString)) {
                    log.warn("Blocked request with suspicious query string from IP: {}",
                            getClientIP(request));
                    response.sendError(HttpServletResponse.SC_BAD_REQUEST,
                            "Invalid request parameters detected");
                    return;
                }
            }

            filterChain.doFilter(wrappedRequest, response);
        }

        private String getClientIP(HttpServletRequest request) {
            String xForwardedFor = request.getHeader("X-Forwarded-For");
            if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
                return xForwardedFor.split(",")[0].trim();
            }
            return request.getRemoteAddr();
        }

        private boolean containsMaliciousContent(String input) {
            if (input == null) return false;
            return XSS_PATTERN.matcher(input).find() ||
                   SQL_INJECTION_PATTERN.matcher(input).find();
        }
    }

    private class SanitizedRequestWrapper extends HttpServletRequestWrapper {

        public SanitizedRequestWrapper(HttpServletRequest request) {
            super(request);
        }

        @Override
        public String getParameter(String name) {
            String value = super.getParameter(name);
            return sanitize(value);
        }

        @Override
        public String[] getParameterValues(String name) {
            String[] values = super.getParameterValues(name);
            if (values == null) return null;

            String[] sanitizedValues = new String[values.length];
            for (int i = 0; i < values.length; i++) {
                sanitizedValues[i] = sanitize(values[i]);
            }
            return sanitizedValues;
        }

        private String sanitize(String value) {
            if (value == null) return null;

            // Truncate overly long parameters
            if (value.length() > MAX_PARAM_LENGTH) {
                value = value.substring(0, MAX_PARAM_LENGTH);
            }

            // Basic HTML entity encoding for special characters
            return value
                    .replace("&", "&amp;")
                    .replace("<", "&lt;")
                    .replace(">", "&gt;")
                    .replace("\"", "&quot;")
                    .replace("'", "&#x27;");
        }
    }
}
