package com.newssentiment.controller;

import com.newssentiment.dto.NotificationPreferencesDTO;
import com.newssentiment.model.User;
import com.newssentiment.repository.UserRepository;
import com.newssentiment.service.ScheduledReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/user")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final ScheduledReportService scheduledReportService;

    @GetMapping("/me")
    public ResponseEntity<UserProfileDTO> getCurrentUser(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(new UserProfileDTO(
            user.getId(),
            user.getEmail(),
            user.getName(),
            user.getRole().name(),
            NotificationPreferencesDTO.fromUser(user)
        ));
    }

    @GetMapping("/notifications")
    public ResponseEntity<NotificationPreferencesDTO> getNotificationPreferences(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(NotificationPreferencesDTO.fromUser(user));
    }

    @PutMapping("/notifications")
    public ResponseEntity<NotificationPreferencesDTO> updateNotificationPreferences(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody NotificationPreferencesDTO preferences) {

        user.setEmailNotificationsEnabled(preferences.emailNotificationsEnabled());
        user.setReportFrequency(preferences.reportFrequency());
        user.setAlertNotificationsEnabled(preferences.alertNotificationsEnabled());
        user.setAlertSeverityThreshold(preferences.alertSeverityThreshold());

        userRepository.save(user);

        return ResponseEntity.ok(NotificationPreferencesDTO.fromUser(user));
    }

    @PostMapping("/notifications/test-report")
    public ResponseEntity<Void> sendTestReport(
            @AuthenticationPrincipal User user,
            @RequestParam(defaultValue = "DAILY") String type) {

        // Temporarily enable email notifications for the test
        boolean wasEnabled = Boolean.TRUE.equals(user.getEmailNotificationsEnabled());
        try {
            user.setEmailNotificationsEnabled(true);
            scheduledReportService.sendTestReport(user, type);
        } finally {
            user.setEmailNotificationsEnabled(wasEnabled);
        }

        return ResponseEntity.ok().build();
    }

    public record UserProfileDTO(
        Long id,
        String email,
        String name,
        String role,
        NotificationPreferencesDTO notificationPreferences
    ) {}
}
