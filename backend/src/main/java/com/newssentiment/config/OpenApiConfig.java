package com.newssentiment.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    @Value("${server.port:8080}")
    private String serverPort;

    @Bean
    public OpenAPI aiimOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("AIIM - AI Information Integrity Monitor API")
                        .description("""
                                REST API for the AI Information Integrity Monitor platform.

                                ## Overview
                                AIIM is an election monitoring and disinformation detection platform that:
                                - Tracks narratives and disinformation campaigns
                                - Analyzes sentiment across Armenian, Russian, and English media
                                - Provides real-time threat alerts
                                - Monitors news sources including RSS feeds and Telegram channels

                                ## Authentication
                                Most endpoints require JWT authentication. Include the token in the Authorization header:
                                ```
                                Authorization: Bearer <token>
                                ```

                                ## Roles
                                - **VIEWER**: Read-only access to dashboards and content
                                - **ANALYST**: Can create/edit narratives and manage alerts
                                - **ADMIN**: Full access including user and source management
                                """)
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("AIIM Support")
                                .email("support@aiim.am"))
                        .license(new License()
                                .name("Proprietary")
                                .url("https://aiim.am/license")))
                .servers(List.of(
                        new Server()
                                .url("http://localhost:" + serverPort)
                                .description("Development Server"),
                        new Server()
                                .url("https://api.aiim.am")
                                .description("Production Server")))
                .addSecurityItem(new SecurityRequirement().addList("bearerAuth"))
                .components(new Components()
                        .addSecuritySchemes("bearerAuth", new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("JWT token obtained from /api/v1/auth/login")));
    }
}
