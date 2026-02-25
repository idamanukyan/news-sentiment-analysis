package com.newssentiment.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "email_alert_notifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmailAlertNotification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "alert_id", nullable = false)
    private ThreatAlert alert;

    @Builder.Default
    @Column(name = "sent_at", nullable = false)
    private Instant sentAt = Instant.now();

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(length = 20)
    private Status status = Status.SENT;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    public enum Status {
        PENDING,
        SENT,
        FAILED
    }
}
