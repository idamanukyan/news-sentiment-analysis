package com.newssentiment.dto;

import com.newssentiment.model.User;
import jakarta.validation.constraints.NotNull;

public record NotificationPreferencesDTO(
    @NotNull Boolean emailNotificationsEnabled,
    @NotNull User.ReportFrequency reportFrequency,
    @NotNull Boolean alertNotificationsEnabled,
    @NotNull User.AlertSeverity alertSeverityThreshold
) {
    public static NotificationPreferencesDTO fromUser(User user) {
        return new NotificationPreferencesDTO(
            Boolean.TRUE.equals(user.getEmailNotificationsEnabled()),
            user.getReportFrequency() != null ? user.getReportFrequency() : User.ReportFrequency.WEEKLY,
            Boolean.TRUE.equals(user.getAlertNotificationsEnabled()),
            user.getAlertSeverityThreshold() != null ? user.getAlertSeverityThreshold() : User.AlertSeverity.HIGH
        );
    }
}
