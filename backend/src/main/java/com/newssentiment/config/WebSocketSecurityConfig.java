package com.newssentiment.config;

import com.newssentiment.security.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.util.List;

/**
 * WebSocket security configuration.
 * Validates JWT tokens on CONNECT and sets up authentication.
 */
@Configuration
@Order(Ordered.HIGHEST_PRECEDENCE + 99)
@RequiredArgsConstructor
@Slf4j
public class WebSocketSecurityConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtService jwtService;

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

                if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
                    // Extract token from header
                    String authHeader = accessor.getFirstNativeHeader("Authorization");

                    if (authHeader != null && authHeader.startsWith("Bearer ")) {
                        String token = authHeader.substring(7);

                        try {
                            // Extract claims from token - validation happens implicitly
                            String username = jwtService.extractUsername(token);
                            String role = jwtService.extractRole(token);
                            Long orgId = jwtService.extractOrganizationId(token);

                            if (username != null && !username.isEmpty()) {
                                // Create authentication
                                var authorities = List.of(new SimpleGrantedAuthority("ROLE_" + role));
                                var auth = new UsernamePasswordAuthenticationToken(username, null, authorities);

                                // Store org ID for later use
                                accessor.setUser(new WebSocketPrincipal(username, orgId, role));

                                log.debug("WebSocket CONNECT authenticated: {} (org: {})", username, orgId);
                            }
                        } catch (Exception e) {
                            log.warn("WebSocket authentication failed: {}", e.getMessage());
                        }
                    }
                }

                return message;
            }
        });
    }

    /**
     * Custom principal that includes organization ID.
     */
    public record WebSocketPrincipal(String email, Long organizationId, String role)
            implements java.security.Principal {
        @Override
        public String getName() {
            return email;
        }
    }
}
