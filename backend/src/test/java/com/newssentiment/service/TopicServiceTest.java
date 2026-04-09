package com.newssentiment.service;

import com.newssentiment.model.Organization;
import com.newssentiment.model.Topic;
import com.newssentiment.model.User;
import com.newssentiment.repository.TopicRepository;
import com.newssentiment.security.OrganizationContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("TopicService Tests")
class TopicServiceTest {

    @Mock
    private TopicRepository topicRepository;

    @InjectMocks
    private TopicService topicService;

    private User user;

    @BeforeEach
    void setUp() {
        Organization org = Organization.builder().id(42L).build();
        user = User.builder()
                .id(7L)
                .email("u@example.com")
                .passwordHash("x")
                .organization(org)
                .build();
    }

    @AfterEach
    void tearDown() {
        OrganizationContext.clear();
    }

    @Test
    @DisplayName("createTopic populates organizationId from OrganizationContext")
    void createTopicPopulatesOrgIdFromContext() {
        OrganizationContext.setCurrentOrganization(99L, "acme", "Acme");
        when(topicRepository.save(any(Topic.class))).thenAnswer(inv -> inv.getArgument(0));

        topicService.createTopic(user, "My Topic", List.of("kw1", "kw2"), null, false, "en");

        ArgumentCaptor<Topic> captor = ArgumentCaptor.forClass(Topic.class);
        verify(topicRepository).save(captor.capture());
        Topic saved = captor.getValue();
        assertThat(saved.getOrganizationId()).isEqualTo(99L);
        assertThat(saved.getName()).isEqualTo("My Topic");
        assertThat(saved.getKeywords()).containsExactly("kw1", "kw2");
    }

    @Test
    @DisplayName("createTopic falls back to user.organizationId when context not set")
    void createTopicFallsBackToUserOrg() {
        when(topicRepository.save(any(Topic.class))).thenAnswer(inv -> inv.getArgument(0));

        topicService.createTopic(user, "T", List.of("kw"), null, null, null);

        ArgumentCaptor<Topic> captor = ArgumentCaptor.forClass(Topic.class);
        verify(topicRepository).save(captor.capture());
        assertThat(captor.getValue().getOrganizationId()).isEqualTo(42L);
    }

    @Test
    @DisplayName("createTopic rejects blank name")
    void createTopicRejectsBlankName() {
        OrganizationContext.setCurrentOrganization(99L, "acme", "Acme");

        assertThatThrownBy(() -> topicService.createTopic(user, "  ", List.of("kw"), null, false, "en"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("name");
        verify(topicRepository, never()).save(any());
    }

    @Test
    @DisplayName("createTopic rejects empty keyword list")
    void createTopicRejectsEmptyKeywords() {
        OrganizationContext.setCurrentOrganization(99L, "acme", "Acme");

        assertThatThrownBy(() -> topicService.createTopic(user, "Name", List.of(), null, false, "en"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("keyword");
        verify(topicRepository, never()).save(any());
    }

    @Test
    @DisplayName("createTopic strips blank keywords and rejects if all blank")
    void createTopicStripsBlankKeywords() {
        OrganizationContext.setCurrentOrganization(99L, "acme", "Acme");

        assertThatThrownBy(() -> topicService.createTopic(user, "Name", List.of("", "  "), null, false, "en"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("keyword");
        verify(topicRepository, never()).save(any());
    }

    @Test
    @DisplayName("createTopic rejects user without organization")
    void createTopicRejectsUserWithoutOrg() {
        User noOrg = User.builder().id(8L).email("x@example.com").passwordHash("x").build();

        assertThatThrownBy(() -> topicService.createTopic(noOrg, "Name", List.of("kw"), null, false, "en"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("organization");
        verify(topicRepository, never()).save(any());
    }
}
