package com.newssentiment.model;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String passwordHash;

    private String name;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(length = 50)
    private Role role = Role.VIEWER;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "organization_id")
    private Organization organization;

    /**
     * Convenience method to get organization ID without loading the full entity.
     */
    public Long getOrganizationId() {
        return organization != null ? organization.getId() : null;
    }

    @Builder.Default
    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    private Instant lastLogin;

    @Builder.Default
    private Boolean enabled = true;

    // Notification preferences
    @Builder.Default
    @Column(name = "email_notifications_enabled")
    private Boolean emailNotificationsEnabled = false;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(name = "report_frequency", length = 20)
    private ReportFrequency reportFrequency = ReportFrequency.WEEKLY;

    @Builder.Default
    @Column(name = "alert_notifications_enabled")
    private Boolean alertNotificationsEnabled = true;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(name = "alert_severity_threshold", length = 20)
    private AlertSeverity alertSeverityThreshold = AlertSeverity.HIGH;

    @Column(name = "last_report_sent_at")
    private Instant lastReportSentAt;

    public enum Role {
        SUPER_ADMIN, // Platform owner - manages all organizations
        ORG_ADMIN,   // Organization admin - manages team members
        ANALYST,     // Full feature access within organization
        VIEWER       // Read-only access to dashboards and content
    }

    public enum ReportFrequency {
        NONE,
        DAILY,
        WEEKLY
    }

    public enum AlertSeverity {
        LOW,
        MEDIUM,
        HIGH,
        CRITICAL
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }
}
