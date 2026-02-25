package com.newssentiment.service;

import com.newssentiment.dto.SourceCreateRequest;
import com.newssentiment.dto.SourceDTO;
import com.newssentiment.model.Source;
import com.newssentiment.repository.ArticleRepository;
import com.newssentiment.repository.SourceRepository;
import com.newssentiment.security.OrganizationContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class SourceService {

    private final SourceRepository sourceRepository;
    private final ArticleRepository articleRepository;

    private Long getOrgId() {
        return OrganizationContext.getCurrentOrganizationIdOrNull();
    }

    @Transactional(readOnly = true)
    public List<SourceDTO> findAll() {
        return sourceRepository.findByOrganizationId(getOrgId()).stream()
                .map(this::toDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<SourceDTO> findActive() {
        return sourceRepository.findByOrganizationIdAndActiveTrue(getOrgId()).stream()
                .map(this::toDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<SourceDTO> findByType(Source.SourceType type) {
        return sourceRepository.findByOrganizationIdAndType(getOrgId(), type).stream()
                .map(this::toDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<SourceDTO> findByLanguage(Source.Language language) {
        return sourceRepository.findByOrganizationIdAndLanguage(getOrgId(), language).stream()
                .map(this::toDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public Optional<SourceDTO> findById(Long id) {
        return sourceRepository.findByIdAndOrganizationId(id, getOrgId()).map(this::toDTO);
    }

    @Transactional
    public SourceDTO create(SourceCreateRequest request) {
        Long orgId = getOrgId();
        if (sourceRepository.existsByOrganizationIdAndUrl(orgId, request.url())) {
            throw new IllegalArgumentException("Source with this URL already exists in your organization");
        }

        Source.PoliticalLeaning leaning = Source.PoliticalLeaning.INDEPENDENT;
        if (request.politicalLeaning() != null && !request.politicalLeaning().isEmpty()) {
            leaning = Source.PoliticalLeaning.valueOf(request.politicalLeaning().toUpperCase());
        }

        Source source = Source.builder()
                .organizationId(orgId)
                .name(request.name())
                .url(request.url())
                .type(Source.SourceType.valueOf(request.type().toUpperCase()))
                .language(Source.Language.valueOf(request.language().toUpperCase()))
                .politicalLeaning(leaning)
                .active(request.active() != null ? request.active() : true)
                .config(request.config() != null ? request.config() : Map.of())
                .build();

        log.info("Creating new source: {} ({}) for org {}", request.name(), request.type(), orgId);
        return toDTO(sourceRepository.save(source));
    }

    @Transactional
    public Optional<SourceDTO> update(Long id, SourceCreateRequest request) {
        return sourceRepository.findByIdAndOrganizationId(id, getOrgId())
                .map(source -> {
                    source.setName(request.name());
                    source.setUrl(request.url());
                    source.setType(Source.SourceType.valueOf(request.type().toUpperCase()));
                    source.setLanguage(Source.Language.valueOf(request.language().toUpperCase()));
                    if (request.politicalLeaning() != null && !request.politicalLeaning().isEmpty()) {
                        source.setPoliticalLeaning(Source.PoliticalLeaning.valueOf(request.politicalLeaning().toUpperCase()));
                    }
                    if (request.active() != null) {
                        source.setActive(request.active());
                    }
                    if (request.config() != null) {
                        source.setConfig(request.config());
                    }
                    log.info("Updated source: {} (id={})", source.getName(), id);
                    return toDTO(sourceRepository.save(source));
                });
    }

    @Transactional
    public Optional<SourceDTO> toggleActive(Long id) {
        return sourceRepository.findByIdAndOrganizationId(id, getOrgId())
                .map(source -> {
                    source.setActive(!source.getActive());
                    log.info("Toggled source {} to active={}", source.getName(), source.getActive());
                    return toDTO(sourceRepository.save(source));
                });
    }

    @Transactional
    public void delete(Long id) {
        // Verify source belongs to current org before deleting
        sourceRepository.findByIdAndOrganizationId(id, getOrgId())
                .ifPresent(source -> {
                    sourceRepository.delete(source);
                    log.info("Deleted source id={}", id);
                });
    }

    @Transactional
    public void updateLastFetched(Long id, boolean success) {
        sourceRepository.findById(id).ifPresent(source -> {
            source.setLastFetched(Instant.now());
            if (success) {
                source.setLastSuccess(Instant.now());
            }
            sourceRepository.save(source);
        });
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getStats() {
        List<Source> allSources = sourceRepository.findByOrganizationId(getOrgId());
        long total = allSources.size();
        long active = allSources.stream().filter(Source::getActive).count();
        long rss = allSources.stream().filter(s -> s.getType() == Source.SourceType.RSS).count();
        long telegram = allSources.stream().filter(s -> s.getType() == Source.SourceType.TELEGRAM).count();
        long webScrape = allSources.stream().filter(s -> s.getType() == Source.SourceType.WEB_SCRAPE).count();

        // Political leaning counts
        long government = allSources.stream()
                .filter(s -> s.getPoliticalLeaning() == Source.PoliticalLeaning.GOVERNMENT).count();
        long opposition = allSources.stream()
                .filter(s -> s.getPoliticalLeaning() == Source.PoliticalLeaning.OPPOSITION).count();
        long independent = allSources.stream()
                .filter(s -> s.getPoliticalLeaning() == Source.PoliticalLeaning.INDEPENDENT
                        || s.getPoliticalLeaning() == null).count();
        long diaspora = allSources.stream()
                .filter(s -> s.getPoliticalLeaning() == Source.PoliticalLeaning.DIASPORA).count();

        return Map.of(
                "total", total,
                "active", active,
                "inactive", total - active,
                "byType", Map.of(
                        "rss", rss,
                        "telegram", telegram,
                        "webScrape", webScrape
                ),
                "byLeaning", Map.of(
                        "government", government,
                        "opposition", opposition,
                        "independent", independent,
                        "diaspora", diaspora
                )
        );
    }

    private SourceDTO toDTO(Source source) {
        // Get article count for this source
        long articleCount = 0;
        try {
            articleCount = articleRepository.countBySourceIdSince(source.getId(),
                Instant.now().minusSeconds(30 * 24 * 60 * 60)); // Last 30 days
        } catch (Exception e) {
            // Ignore if count fails
        }

        return new SourceDTO(
                source.getId(),
                source.getName(),
                source.getUrl(),
                source.getType().name(),
                source.getLanguage().name(),
                source.getPoliticalLeaning() != null ? source.getPoliticalLeaning().name() : "INDEPENDENT",
                source.getActive(),
                source.getLastFetched(),
                source.getLastSuccess(),
                source.getConfig(),
                articleCount,
                source.getCredibilityScore(),
                source.getCredibilityFactors(),
                source.getCredibilityUpdatedAt(),
                source.getCreatedAt()
        );
    }
}
