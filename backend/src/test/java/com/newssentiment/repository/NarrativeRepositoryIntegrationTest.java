package com.newssentiment.repository;

import com.newssentiment.config.TestContainersConfig;
import com.newssentiment.model.Narrative;
import com.newssentiment.model.Narrative.NarrativeStatus;
import com.newssentiment.model.Narrative.ThreatLevel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Testcontainers
@EnabledIfEnvironmentVariable(named = "DOCKER_HOST", matches = ".*", disabledReason = "Docker not available")
@ActiveProfiles("test")
@Import(TestContainersConfig.class)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@DisplayName("NarrativeRepository Integration Tests")
class NarrativeRepositoryIntegrationTest {

    @Autowired
    private NarrativeRepository narrativeRepository;

    @BeforeEach
    void setUp() {
        narrativeRepository.deleteAll();
    }

    @Test
    @DisplayName("Should save and retrieve narrative")
    void shouldSaveAndRetrieveNarrative() {
        Narrative narrative = Narrative.builder()
                .name("Election Fraud Claims")
                .description("Claims about election fraud")
                .keywords(new String[]{"fraud", "rigged", "stolen"})
                .status(NarrativeStatus.ACTIVE)
                .threatLevel(ThreatLevel.HIGH)
                .firstSeen(Instant.now())
                .articleCount(0)
                .build();

        Narrative saved = narrativeRepository.save(narrative);

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getName()).isEqualTo("Election Fraud Claims");
        assertThat(saved.getKeywords()).containsExactly("fraud", "rigged", "stolen");
    }

    @Test
    @DisplayName("Should find narratives by status")
    void shouldFindNarrativesByStatus() {
        createNarrative("Active Narrative 1", NarrativeStatus.ACTIVE, ThreatLevel.HIGH);
        createNarrative("Active Narrative 2", NarrativeStatus.ACTIVE, ThreatLevel.MEDIUM);
        createNarrative("Archived Narrative", NarrativeStatus.ARCHIVED, ThreatLevel.LOW);

        List<Narrative> activeNarratives = narrativeRepository.findByStatus(NarrativeStatus.ACTIVE);

        assertThat(activeNarratives).hasSize(2);
        assertThat(activeNarratives).allMatch(n -> n.getStatus() == NarrativeStatus.ACTIVE);
    }

    @Test
    @DisplayName("Should find narratives by multiple statuses")
    void shouldFindNarrativesByMultipleStatuses() {
        createNarrative("Active", NarrativeStatus.ACTIVE, ThreatLevel.HIGH);
        createNarrative("Monitoring", NarrativeStatus.MONITORING, ThreatLevel.MEDIUM);
        createNarrative("Archived", NarrativeStatus.ARCHIVED, ThreatLevel.LOW);

        Page<Narrative> result = narrativeRepository.findByStatusIn(
                List.of(NarrativeStatus.ACTIVE, NarrativeStatus.MONITORING),
                PageRequest.of(0, 10)
        );

        assertThat(result.getContent()).hasSize(2);
    }

    @Test
    @DisplayName("Should count narratives by status")
    void shouldCountNarrativesByStatus() {
        createNarrative("Active 1", NarrativeStatus.ACTIVE, ThreatLevel.HIGH);
        createNarrative("Active 2", NarrativeStatus.ACTIVE, ThreatLevel.MEDIUM);
        createNarrative("Archived", NarrativeStatus.ARCHIVED, ThreatLevel.LOW);

        long activeCount = narrativeRepository.countByStatus(NarrativeStatus.ACTIVE);

        assertThat(activeCount).isEqualTo(2);
    }

    @Test
    @DisplayName("Should count active narratives by threat level")
    void shouldCountActiveNarrativesByThreatLevel() {
        createNarrative("Critical 1", NarrativeStatus.ACTIVE, ThreatLevel.CRITICAL);
        createNarrative("Critical 2", NarrativeStatus.ACTIVE, ThreatLevel.CRITICAL);
        createNarrative("High", NarrativeStatus.ACTIVE, ThreatLevel.HIGH);
        createNarrative("Archived Critical", NarrativeStatus.ARCHIVED, ThreatLevel.CRITICAL);

        long criticalCount = narrativeRepository.countActiveByThreatLevel(ThreatLevel.CRITICAL);

        assertThat(criticalCount).isEqualTo(2);
    }

    @Test
    @DisplayName("Should find active narratives ordered by article count")
    void shouldFindActiveNarrativesOrderedByArticleCount() {
        Narrative low = createNarrative("Low Count", NarrativeStatus.ACTIVE, ThreatLevel.MEDIUM);
        low.setArticleCount(5);
        narrativeRepository.save(low);

        Narrative high = createNarrative("High Count", NarrativeStatus.ACTIVE, ThreatLevel.HIGH);
        high.setArticleCount(50);
        narrativeRepository.save(high);

        Narrative mid = createNarrative("Mid Count", NarrativeStatus.ACTIVE, ThreatLevel.LOW);
        mid.setArticleCount(25);
        narrativeRepository.save(mid);

        List<Narrative> result = narrativeRepository.findActiveOrderByArticleCount(NarrativeStatus.ACTIVE);

        assertThat(result).hasSize(3);
        assertThat(result.get(0).getName()).isEqualTo("High Count");
        assertThat(result.get(1).getName()).isEqualTo("Mid Count");
        assertThat(result.get(2).getName()).isEqualTo("Low Count");
    }

    @Test
    @DisplayName("Should enforce unique name constraint")
    void shouldEnforceUniqueNameConstraint() {
        createNarrative("Unique Name", NarrativeStatus.ACTIVE, ThreatLevel.HIGH);

        assertThat(narrativeRepository.findAll()).hasSize(1);
        // Second save with same name would throw DataIntegrityViolationException
    }

    private Narrative createNarrative(String name, NarrativeStatus status, ThreatLevel level) {
        Narrative narrative = Narrative.builder()
                .name(name)
                .description("Description for " + name)
                .keywords(new String[]{"keyword1", "keyword2"})
                .status(status)
                .threatLevel(level)
                .firstSeen(Instant.now())
                .articleCount(0)
                .build();
        return narrativeRepository.save(narrative);
    }
}
