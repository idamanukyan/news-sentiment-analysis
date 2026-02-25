package com.newssentiment.service;

import com.newssentiment.dto.NarrativeCreateRequest;
import com.newssentiment.dto.NarrativeDTO;
import com.newssentiment.model.Narrative;
import com.newssentiment.model.Narrative.NarrativeStatus;
import com.newssentiment.model.Narrative.ThreatLevel;
import com.newssentiment.repository.ArticleRepository;
import com.newssentiment.repository.CoordinationEventRepository;
import com.newssentiment.repository.FactCheckRepository;
import com.newssentiment.repository.NarrativeRepository;
import com.newssentiment.repository.ThreatAlertRepository;
import com.newssentiment.security.OrganizationContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("NarrativeService Tests")
class NarrativeServiceTest {

    private static final Long TEST_ORG_ID = 1L;

    @Mock
    private NarrativeRepository narrativeRepository;

    @Mock
    private ThreatAlertRepository alertRepository;

    @Mock
    private ArticleRepository articleRepository;

    @Mock
    private CoordinationEventRepository coordinationEventRepository;

    @Mock
    private FactCheckRepository factCheckRepository;

    @InjectMocks
    private NarrativeService narrativeService;

    private Narrative testNarrative;

    @BeforeEach
    void setUp() {
        // Set organization context for tests
        OrganizationContext.setCurrentOrganization(TEST_ORG_ID, "test-org", "Test Organization");

        testNarrative = Narrative.builder()
                .id(1L)
                .organizationId(TEST_ORG_ID)
                .name("Election Fraud Claims")
                .description("Claims about election fraud")
                .keywords(new String[]{"fraud", "rigged", "stolen"})
                .status(NarrativeStatus.ACTIVE)
                .threatLevel(ThreatLevel.HIGH)
                .firstSeen(Instant.now().minusSeconds(86400))
                .articleCount(10)
                .createdAt(Instant.now().minusSeconds(86400))
                .build();

        // Setup default mocks for toDTO dependencies
        lenient().when(coordinationEventRepository.hasActiveCoordinationEvents(anyLong())).thenReturn(false);
        lenient().when(coordinationEventRepository.countByNarrativeId(anyLong())).thenReturn(0);
        lenient().when(factCheckRepository.countByNarrativeId(anyLong())).thenReturn(0L);
    }

    @AfterEach
    void tearDown() {
        OrganizationContext.clear();
    }

    @Nested
    @DisplayName("findAll tests")
    class FindAllTests {

        @Test
        @DisplayName("Should return paginated narratives")
        void shouldReturnPaginatedNarratives() {
            Pageable pageable = PageRequest.of(0, 10);
            Page<Narrative> narrativePage = new PageImpl<>(List.of(testNarrative), pageable, 1);
            when(narrativeRepository.findByOrganizationId(eq(TEST_ORG_ID), eq(pageable))).thenReturn(narrativePage);

            Page<NarrativeDTO> result = narrativeService.findAll(pageable);

            assertThat(result.getContent()).hasSize(1);
            assertThat(result.getContent().get(0).name()).isEqualTo("Election Fraud Claims");
            verify(narrativeRepository).findByOrganizationId(eq(TEST_ORG_ID), eq(pageable));
        }

        @Test
        @DisplayName("Should return empty page when no narratives exist")
        void shouldReturnEmptyPage() {
            Pageable pageable = PageRequest.of(0, 10);
            Page<Narrative> emptyPage = new PageImpl<>(Collections.emptyList(), pageable, 0);
            when(narrativeRepository.findByOrganizationId(eq(TEST_ORG_ID), eq(pageable))).thenReturn(emptyPage);

            Page<NarrativeDTO> result = narrativeService.findAll(pageable);

            assertThat(result.getContent()).isEmpty();
        }
    }

    @Nested
    @DisplayName("findById tests")
    class FindByIdTests {

        @Test
        @DisplayName("Should return narrative when found")
        void shouldReturnNarrativeWhenFound() {
            when(narrativeRepository.findByIdAndOrganizationId(1L, TEST_ORG_ID)).thenReturn(Optional.of(testNarrative));

            Optional<NarrativeDTO> result = narrativeService.findById(1L);

            assertThat(result).isPresent();
            assertThat(result.get().name()).isEqualTo("Election Fraud Claims");
            assertThat(result.get().threatLevel()).isEqualTo("HIGH");
        }

        @Test
        @DisplayName("Should return empty when narrative not found")
        void shouldReturnEmptyWhenNotFound() {
            when(narrativeRepository.findByIdAndOrganizationId(999L, TEST_ORG_ID)).thenReturn(Optional.empty());

            Optional<NarrativeDTO> result = narrativeService.findById(999L);

            assertThat(result).isEmpty();
        }
    }

    @Nested
    @DisplayName("create tests")
    class CreateTests {

        @Test
        @DisplayName("Should create narrative with default threat level")
        void shouldCreateNarrativeWithDefaultThreatLevel() {
            NarrativeCreateRequest request = new NarrativeCreateRequest(
                    "New Narrative",
                    "Description",
                    List.of("keyword1", "keyword2"),
                    null
            );

            when(narrativeRepository.save(any(Narrative.class))).thenAnswer(invocation -> {
                Narrative saved = invocation.getArgument(0);
                saved.setId(2L);
                return saved;
            });

            NarrativeDTO result = narrativeService.create(request);

            assertThat(result.name()).isEqualTo("New Narrative");
            assertThat(result.threatLevel()).isEqualTo("LOW");

            ArgumentCaptor<Narrative> captor = ArgumentCaptor.forClass(Narrative.class);
            verify(narrativeRepository).save(captor.capture());
            assertThat(captor.getValue().getThreatLevel()).isEqualTo(ThreatLevel.LOW);
        }

        @Test
        @DisplayName("Should create narrative with specified threat level")
        void shouldCreateNarrativeWithSpecifiedThreatLevel() {
            NarrativeCreateRequest request = new NarrativeCreateRequest(
                    "Critical Narrative",
                    "Very important",
                    List.of("critical", "urgent"),
                    "CRITICAL"
            );

            when(narrativeRepository.save(any(Narrative.class))).thenAnswer(invocation -> {
                Narrative saved = invocation.getArgument(0);
                saved.setId(3L);
                return saved;
            });

            NarrativeDTO result = narrativeService.create(request);

            assertThat(result.threatLevel()).isEqualTo("CRITICAL");
        }
    }

    @Nested
    @DisplayName("updateStatus tests")
    class UpdateStatusTests {

        @Test
        @DisplayName("Should update narrative status")
        void shouldUpdateNarrativeStatus() {
            when(narrativeRepository.findByIdAndOrganizationId(1L, TEST_ORG_ID)).thenReturn(Optional.of(testNarrative));
            when(narrativeRepository.save(any(Narrative.class))).thenReturn(testNarrative);

            Optional<NarrativeDTO> result = narrativeService.updateStatus(1L, NarrativeStatus.ARCHIVED);

            assertThat(result).isPresent();
            verify(narrativeRepository).save(any(Narrative.class));
        }

        @Test
        @DisplayName("Should return empty when narrative not found for status update")
        void shouldReturnEmptyWhenNotFoundForStatusUpdate() {
            when(narrativeRepository.findByIdAndOrganizationId(999L, TEST_ORG_ID)).thenReturn(Optional.empty());

            Optional<NarrativeDTO> result = narrativeService.updateStatus(999L, NarrativeStatus.ARCHIVED);

            assertThat(result).isEmpty();
            verify(narrativeRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("detectNarratives tests")
    class DetectNarrativesTests {

        @Test
        @DisplayName("Should detect narratives matching keywords")
        void shouldDetectNarrativesMatchingKeywords() {
            Narrative narrative1 = Narrative.builder()
                    .id(1L)
                    .name("Election Fraud")
                    .keywords(new String[]{"fraud", "rigged"})
                    .status(NarrativeStatus.ACTIVE)
                    .build();

            Narrative narrative2 = Narrative.builder()
                    .id(2L)
                    .name("Foreign Interference")
                    .keywords(new String[]{"interference", "foreign"})
                    .status(NarrativeStatus.ACTIVE)
                    .build();

            when(narrativeRepository.findByStatus(NarrativeStatus.ACTIVE))
                    .thenReturn(List.of(narrative1, narrative2));

            List<Long> result = narrativeService.detectNarratives(
                    "Article about election fraud",
                    "This discusses claims of rigged elections"
            );

            assertThat(result).containsExactly(1L);
        }

        @Test
        @DisplayName("Should return empty list when no narratives match")
        void shouldReturnEmptyListWhenNoMatch() {
            Narrative narrative = Narrative.builder()
                    .id(1L)
                    .keywords(new String[]{"fraud", "rigged"})
                    .status(NarrativeStatus.ACTIVE)
                    .build();

            when(narrativeRepository.findByStatus(NarrativeStatus.ACTIVE))
                    .thenReturn(List.of(narrative));

            List<Long> result = narrativeService.detectNarratives(
                    "Normal news article",
                    "Nothing controversial here"
            );

            assertThat(result).isEmpty();
        }
    }

    @Nested
    @DisplayName("getOverallThreatLevel tests")
    class GetOverallThreatLevelTests {

        @Test
        @DisplayName("Should return CRITICAL when critical narratives exist")
        void shouldReturnCriticalWhenCriticalExists() {
            when(narrativeRepository.countByOrganizationIdAndActiveByThreatLevel(TEST_ORG_ID, ThreatLevel.CRITICAL)).thenReturn(1L);

            ThreatLevel result = narrativeService.getOverallThreatLevel();

            assertThat(result).isEqualTo(ThreatLevel.CRITICAL);
        }

        @Test
        @DisplayName("Should return HIGH when 2+ high narratives exist")
        void shouldReturnHighWhenMultipleHighExist() {
            when(narrativeRepository.countByOrganizationIdAndActiveByThreatLevel(TEST_ORG_ID, ThreatLevel.CRITICAL)).thenReturn(0L);
            when(narrativeRepository.countByOrganizationIdAndActiveByThreatLevel(TEST_ORG_ID, ThreatLevel.HIGH)).thenReturn(2L);

            ThreatLevel result = narrativeService.getOverallThreatLevel();

            assertThat(result).isEqualTo(ThreatLevel.HIGH);
        }

        @Test
        @DisplayName("Should return MEDIUM when 1 high or 3+ medium narratives exist")
        void shouldReturnMediumWhenMixedThreats() {
            when(narrativeRepository.countByOrganizationIdAndActiveByThreatLevel(TEST_ORG_ID, ThreatLevel.CRITICAL)).thenReturn(0L);
            when(narrativeRepository.countByOrganizationIdAndActiveByThreatLevel(TEST_ORG_ID, ThreatLevel.HIGH)).thenReturn(1L);
            when(narrativeRepository.countByOrganizationIdAndActiveByThreatLevel(TEST_ORG_ID, ThreatLevel.MEDIUM)).thenReturn(0L);

            ThreatLevel result = narrativeService.getOverallThreatLevel();

            assertThat(result).isEqualTo(ThreatLevel.MEDIUM);
        }

        @Test
        @DisplayName("Should return LOW when no significant threats")
        void shouldReturnLowWhenNoThreats() {
            when(narrativeRepository.countByOrganizationIdAndActiveByThreatLevel(TEST_ORG_ID, ThreatLevel.CRITICAL)).thenReturn(0L);
            when(narrativeRepository.countByOrganizationIdAndActiveByThreatLevel(TEST_ORG_ID, ThreatLevel.HIGH)).thenReturn(0L);
            when(narrativeRepository.countByOrganizationIdAndActiveByThreatLevel(TEST_ORG_ID, ThreatLevel.MEDIUM)).thenReturn(1L);

            ThreatLevel result = narrativeService.getOverallThreatLevel();

            assertThat(result).isEqualTo(ThreatLevel.LOW);
        }
    }

    @Nested
    @DisplayName("delete tests")
    class DeleteTests {

        @Test
        @DisplayName("Should delete narrative by id")
        void shouldDeleteNarrativeById() {
            when(narrativeRepository.findByIdAndOrganizationId(1L, TEST_ORG_ID)).thenReturn(Optional.of(testNarrative));
            doNothing().when(narrativeRepository).delete(testNarrative);

            narrativeService.delete(1L);

            verify(narrativeRepository).findByIdAndOrganizationId(1L, TEST_ORG_ID);
            verify(narrativeRepository).delete(testNarrative);
        }

        @Test
        @DisplayName("Should not delete when narrative not found")
        void shouldNotDeleteWhenNotFound() {
            when(narrativeRepository.findByIdAndOrganizationId(999L, TEST_ORG_ID)).thenReturn(Optional.empty());

            narrativeService.delete(999L);

            verify(narrativeRepository, never()).delete(any());
        }
    }
}
