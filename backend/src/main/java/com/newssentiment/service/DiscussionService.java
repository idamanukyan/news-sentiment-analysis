package com.newssentiment.service;

import com.newssentiment.dto.*;
import com.newssentiment.model.*;
import com.newssentiment.repository.*;
import com.newssentiment.security.OrganizationContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class DiscussionService {

    private static final Pattern MENTION_PATTERN = Pattern.compile("@(\\w+(?:\\.\\w+)*)");

    private final DiscussionThreadRepository threadRepository;
    private final DiscussionReplyRepository replyRepository;
    private final UserRepository userRepository;
    private final NarrativeRepository narrativeRepository;
    private final ThreatAlertRepository alertRepository;
    private final DiscussionMentionRepository mentionRepository;
    private final WebSocketNotificationService wsNotificationService;

    private Long getOrgId() {
        return OrganizationContext.getCurrentOrganizationIdOrNull();
    }

    // ============ Thread Operations ============

    @Transactional(readOnly = true)
    public List<DiscussionThreadDTO> getThreads() {
        Long orgId = getOrgId();
        if (orgId == null) {
            return List.of();
        }
        return threadRepository.findByOrganizationIdOrderByPinnedDescCreatedAtDesc(orgId).stream()
                .map(thread -> DiscussionThreadDTO.fromEntity(thread,
                    (int) replyRepository.countByThreadId(thread.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public Optional<ThreadDetailDTO> getThread(Long threadId) {
        Long orgId = getOrgId();
        if (orgId == null) {
            return Optional.empty();
        }
        return threadRepository.findByIdAndOrganizationId(threadId, orgId)
                .map(thread -> {
                    List<DiscussionReplyDTO> replies = replyRepository
                            .findByThreadIdOrderByCreatedAtAsc(threadId)
                            .stream()
                            .map(DiscussionReplyDTO::fromEntity)
                            .toList();
                    return new ThreadDetailDTO(
                            DiscussionThreadDTO.fromEntity(thread, replies.size()),
                            replies
                    );
                });
    }

    @Transactional
    public DiscussionThreadDTO createThread(Long authorId, ThreadCreateRequest request) {
        Long orgId = getOrgId();
        if (orgId == null) {
            throw new IllegalStateException("No organization context");
        }

        User author = userRepository.findById(authorId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        DiscussionThread.DiscussionThreadBuilder builder = DiscussionThread.builder()
                .organizationId(orgId)
                .author(author)
                .title(request.title())
                .content(request.content())
                .discussionType(request.discussionType() != null ? request.discussionType() : "GENERAL");

        // Link to narrative if provided
        if (request.narrativeId() != null) {
            narrativeRepository.findById(request.narrativeId())
                    .ifPresent(builder::narrative);
        }

        // Link to alert if provided
        if (request.alertId() != null) {
            alertRepository.findById(request.alertId())
                    .ifPresent(builder::alert);
        }

        DiscussionThread saved = threadRepository.save(builder.build());
        log.info("User {} created discussion thread: {}", author.getEmail(), saved.getTitle());

        // Process @mentions in content
        processMentions(saved.getContent(), author, saved, null, orgId);

        // Notify via WebSocket
        wsNotificationService.broadcastToOrg(orgId, "NEW_DISCUSSION", Map.of(
                "threadId", saved.getId(),
                "title", saved.getTitle(),
                "author", getDisplayName(author)
        ));

        return DiscussionThreadDTO.fromEntity(saved, 0);
    }

    @Transactional
    public Optional<DiscussionThreadDTO> updateThread(Long threadId, Long userId, ThreadCreateRequest request) {
        Long orgId = getOrgId();
        if (orgId == null) {
            return Optional.empty();
        }

        return threadRepository.findByIdAndOrganizationId(threadId, orgId)
                .filter(thread -> canModifyThread(thread, userId))
                .map(thread -> {
                    thread.setTitle(request.title());
                    thread.setContent(request.content());
                    DiscussionThread saved = threadRepository.save(thread);
                    log.info("Updated discussion thread: {}", saved.getTitle());
                    return DiscussionThreadDTO.fromEntity(saved,
                        (int) replyRepository.countByThreadId(saved.getId()));
                });
    }

    @Transactional
    public boolean deleteThread(Long threadId, Long userId) {
        Long orgId = getOrgId();
        if (orgId == null) {
            return false;
        }

        return threadRepository.findByIdAndOrganizationId(threadId, orgId)
                .filter(thread -> canModifyThread(thread, userId))
                .map(thread -> {
                    threadRepository.delete(thread);
                    log.info("Deleted discussion thread: {} (id={})", thread.getTitle(), threadId);
                    return true;
                })
                .orElse(false);
    }

    @Transactional
    public Optional<DiscussionThreadDTO> pinThread(Long threadId, boolean pin) {
        Long orgId = getOrgId();
        if (orgId == null) {
            return Optional.empty();
        }

        return threadRepository.findByIdAndOrganizationId(threadId, orgId)
                .map(thread -> {
                    thread.setPinned(pin);
                    DiscussionThread saved = threadRepository.save(thread);
                    log.info("{} discussion thread: {}", pin ? "Pinned" : "Unpinned", saved.getTitle());
                    return DiscussionThreadDTO.fromEntity(saved,
                        (int) replyRepository.countByThreadId(saved.getId()));
                });
    }

    // ============ Reply Operations ============

    @Transactional
    public Optional<DiscussionReplyDTO> addReply(Long threadId, Long authorId, ReplyCreateRequest request) {
        Long orgId = getOrgId();
        if (orgId == null) {
            return Optional.empty();
        }

        return threadRepository.findByIdAndOrganizationId(threadId, orgId)
                .map(thread -> {
                    User author = userRepository.findById(authorId)
                            .orElseThrow(() -> new IllegalArgumentException("User not found"));

                    DiscussionReply reply = DiscussionReply.builder()
                            .thread(thread)
                            .author(author)
                            .content(request.content())
                            .build();

                    DiscussionReply saved = replyRepository.save(reply);
                    log.info("User {} added reply to thread: {}", author.getEmail(), thread.getTitle());

                    // Process @mentions in content
                    processMentions(saved.getContent(), author, null, saved, orgId);

                    // Notify via WebSocket
                    wsNotificationService.broadcastToOrg(orgId, "NEW_REPLY", Map.of(
                            "threadId", thread.getId(),
                            "replyId", saved.getId(),
                            "threadTitle", thread.getTitle(),
                            "author", getDisplayName(author)
                    ));

                    return DiscussionReplyDTO.fromEntity(saved);
                });
    }

    @Transactional
    public Optional<DiscussionReplyDTO> updateReply(Long replyId, Long userId, ReplyCreateRequest request) {
        Long orgId = getOrgId();
        if (orgId == null) {
            return Optional.empty();
        }

        return replyRepository.findById(replyId)
                .filter(reply -> reply.getThread().getOrganizationId().equals(orgId))
                .filter(reply -> canModifyReply(reply, userId))
                .map(reply -> {
                    String oldContent = reply.getContent();
                    reply.setContent(request.content());
                    DiscussionReply saved = replyRepository.save(reply);
                    log.info("Updated reply id={} in thread: {}", replyId, reply.getThread().getTitle());

                    // Process new @mentions (only for newly added mentions)
                    User author = userRepository.findById(userId).orElse(null);
                    if (author != null) {
                        Set<String> oldMentions = extractMentions(oldContent);
                        Set<String> newMentions = extractMentions(request.content());
                        newMentions.removeAll(oldMentions);
                        if (!newMentions.isEmpty()) {
                            processNewMentions(newMentions, author, null, saved, orgId);
                        }
                    }

                    return DiscussionReplyDTO.fromEntity(saved);
                });
    }

    @Transactional
    public boolean deleteReply(Long replyId, Long userId) {
        Long orgId = getOrgId();
        if (orgId == null) {
            return false;
        }

        return replyRepository.findById(replyId)
                .filter(reply -> reply.getThread().getOrganizationId().equals(orgId))
                .filter(reply -> canModifyReply(reply, userId))
                .map(reply -> {
                    replyRepository.delete(reply);
                    log.info("Deleted reply id={} from thread: {}", replyId, reply.getThread().getTitle());
                    return true;
                })
                .orElse(false);
    }

    // ============ Permission Helpers ============

    private boolean canModifyThread(DiscussionThread thread, Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return false;

        // Author can always modify their own thread
        if (thread.getAuthor().getId().equals(userId)) return true;

        // ORG_ADMIN and SUPER_ADMIN can modify any thread in their org
        return user.getRole() == User.Role.ORG_ADMIN || user.getRole() == User.Role.SUPER_ADMIN;
    }

    private boolean canModifyReply(DiscussionReply reply, Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return false;

        // Author can always modify their own reply
        if (reply.getAuthor().getId().equals(userId)) return true;

        // ORG_ADMIN and SUPER_ADMIN can modify any reply in their org
        return user.getRole() == User.Role.ORG_ADMIN || user.getRole() == User.Role.SUPER_ADMIN;
    }

    // ============ Mention Operations ============

    @Transactional(readOnly = true)
    public List<MentionDTO> getUnreadMentions(Long userId) {
        return mentionRepository.findByMentionedUserIdAndIsReadFalseOrderByCreatedAtDesc(userId)
                .stream()
                .map(MentionDTO::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public long getUnreadMentionCount(Long userId) {
        return mentionRepository.countByMentionedUserIdAndIsReadFalse(userId);
    }

    @Transactional
    public void markMentionAsRead(Long mentionId, Long userId) {
        mentionRepository.markAsRead(mentionId, userId);
    }

    @Transactional
    public void markAllMentionsAsRead(Long userId) {
        mentionRepository.markAllAsRead(userId);
    }

    // ============ Mention Helpers ============

    private void processMentions(String content, User mentioner, DiscussionThread thread, DiscussionReply reply, Long orgId) {
        Set<String> usernames = extractMentions(content);
        processNewMentions(usernames, mentioner, thread, reply, orgId);
    }

    private Set<String> extractMentions(String content) {
        Set<String> mentions = new HashSet<>();
        Matcher matcher = MENTION_PATTERN.matcher(content);
        while (matcher.find()) {
            mentions.add(matcher.group(1).toLowerCase());
        }
        return mentions;
    }

    private void processNewMentions(Set<String> usernames, User mentioner, DiscussionThread thread, DiscussionReply reply, Long orgId) {
        if (usernames.isEmpty()) {
            return;
        }

        // Find users by display name (matching partial)
        List<User> orgUsers = userRepository.findByOrganization_IdOrderByCreatedAtDesc(orgId);
        for (User user : orgUsers) {
            // Skip self-mentions
            if (user.getId().equals(mentioner.getId())) {
                continue;
            }

            // Check if user's display name matches any @mention
            String displayName = getDisplayName(user).toLowerCase().replace(" ", ".");
            String email = user.getEmail().split("@")[0].toLowerCase();

            for (String username : usernames) {
                if (displayName.contains(username) || email.equals(username)) {
                    // Create mention record
                    DiscussionMention mention = DiscussionMention.builder()
                            .thread(thread)
                            .reply(reply)
                            .mentionedUser(user)
                            .mentioner(mentioner)
                            .build();
                    mentionRepository.save(mention);

                    // Send WebSocket notification to mentioned user
                    wsNotificationService.broadcastToOrg(orgId, "MENTION", Map.of(
                            "mentionedUserId", user.getId(),
                            "threadId", thread != null ? thread.getId() : reply.getThread().getId(),
                            "threadTitle", thread != null ? thread.getTitle() : reply.getThread().getTitle(),
                            "mentioner", getDisplayName(mentioner)
                    ));

                    log.info("User {} mentioned {} in discussion", mentioner.getEmail(), user.getEmail());
                    break;
                }
            }
        }
    }

    // Helper to get display name with fallback to email
    private String getDisplayName(User user) {
        return user.getName() != null && !user.getName().isBlank() ? user.getName() : user.getEmail();
    }

    // ============ DTO for Thread Detail ============

    public record ThreadDetailDTO(
            DiscussionThreadDTO thread,
            List<DiscussionReplyDTO> replies
    ) {}
}
