package com.newssentiment.config;

import com.langfuse.Langfuse;
import com.langfuse.model.Generation;
import com.langfuse.model.Trace;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import jakarta.annotation.PreDestroy;
import java.util.Map;
import java.util.Optional;

/**
 * Configuration for Langfuse LLM observability.
 * Provides tracing for all LLM API calls.
 */
@Configuration
@Slf4j
public class LangfuseConfig {

    @Value("${app.langfuse.enabled:true}")
    private boolean enabled;

    @Value("${app.langfuse.public-key:}")
    private String publicKey;

    @Value("${app.langfuse.secret-key:}")
    private String secretKey;

    @Value("${app.langfuse.host:https://cloud.langfuse.com}")
    private String host;

    private Langfuse langfuseClient;

    @Getter
    private boolean configured = false;

    @Bean
    public Optional<Langfuse> langfuse() {
        if (!enabled) {
            log.info("Langfuse is disabled");
            return Optional.empty();
        }

        if (publicKey == null || publicKey.isBlank() || secretKey == null || secretKey.isBlank()) {
            log.warn("Langfuse not configured: missing LANGFUSE_PUBLIC_KEY or LANGFUSE_SECRET_KEY");
            return Optional.empty();
        }

        try {
            langfuseClient = new Langfuse(publicKey, secretKey, host);
            configured = true;
            log.info("Langfuse initialized successfully (host: {})", host);
            return Optional.of(langfuseClient);
        } catch (Exception e) {
            log.error("Failed to initialize Langfuse: {}", e.getMessage());
            return Optional.empty();
        }
    }

    /**
     * Create a new trace for an LLM operation.
     */
    public Optional<Trace> createTrace(String name, Map<String, Object> metadata) {
        if (langfuseClient == null) {
            return Optional.empty();
        }

        try {
            Trace trace = langfuseClient.trace(name);
            if (metadata != null) {
                trace.setMetadata(metadata);
            }
            return Optional.of(trace);
        } catch (Exception e) {
            log.error("Failed to create Langfuse trace: {}", e.getMessage());
            return Optional.empty();
        }
    }

    /**
     * Create a generation span within a trace.
     */
    public Optional<Generation> createGeneration(
            Trace trace,
            String name,
            String model,
            String prompt,
            Map<String, Object> metadata
    ) {
        if (trace == null) {
            return Optional.empty();
        }

        try {
            Generation generation = trace.generation(name);
            generation.setModel(model);
            generation.setInput(prompt);
            if (metadata != null) {
                generation.setMetadata(metadata);
            }
            return Optional.of(generation);
        } catch (Exception e) {
            log.error("Failed to create Langfuse generation: {}", e.getMessage());
            return Optional.empty();
        }
    }

    /**
     * End a generation span with output and usage data.
     */
    public void endGeneration(
            Generation generation,
            String output,
            Integer inputTokens,
            Integer outputTokens
    ) {
        if (generation == null) {
            return;
        }

        try {
            generation.setOutput(output);
            if (inputTokens != null && outputTokens != null) {
                generation.setUsage(inputTokens, outputTokens);
            }
            generation.end();
        } catch (Exception e) {
            log.error("Failed to end Langfuse generation: {}", e.getMessage());
        }
    }

    /**
     * End a trace.
     */
    public void endTrace(Trace trace) {
        if (trace == null) {
            return;
        }

        try {
            trace.end();
        } catch (Exception e) {
            log.error("Failed to end Langfuse trace: {}", e.getMessage());
        }
    }

    @PreDestroy
    public void shutdown() {
        if (langfuseClient != null) {
            try {
                langfuseClient.flush();
                langfuseClient.shutdown();
                log.info("Langfuse client shut down successfully");
            } catch (Exception e) {
                log.error("Error shutting down Langfuse: {}", e.getMessage());
            }
        }
    }
}
