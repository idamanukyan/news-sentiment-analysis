package com.newssentiment.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

import java.io.IOException;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Serve static resources from file:/app/static/ (Docker) and classpath:/static/ (local)
        registry.addResourceHandler("/**")
                .addResourceLocations("file:/app/static/", "classpath:/static/")
                .resourceChain(true)
                .addResolver(new PathResourceResolver() {
                    @Override
                    protected Resource getResource(String resourcePath, Resource location) throws IOException {
                        Resource requestedResource = location.createRelative(resourcePath);

                        // If resource exists, serve it
                        if (requestedResource.exists() && requestedResource.isReadable()) {
                            return requestedResource;
                        }

                        // For SPA: if resource doesn't exist and path doesn't start with /api,
                        // return index.html so client-side routing can handle it
                        if (!resourcePath.startsWith("api/") &&
                            !resourcePath.startsWith("actuator/") &&
                            !resourcePath.startsWith("ws/") &&
                            !resourcePath.startsWith("v3/api-docs")) {

                            // Try to find index.html in the resource locations
                            Resource indexResource = location.createRelative("index.html");
                            if (indexResource.exists() && indexResource.isReadable()) {
                                return indexResource;
                            }
                        }

                        return null;
                    }
                });
    }
}
