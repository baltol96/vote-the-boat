package com.assembly.domain.governor;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "governor_pledges", indexes = {
        @Index(name = "idx_governor_pledges_huboid", columnList = "huboid")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class GovernorPledge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 20)
    private String huboid;

    @Column(nullable = false)
    private int pledgeOrder;

    @Column(length = 255)
    private String realmName;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String content;

    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    @Builder
    public GovernorPledge(String huboid, int pledgeOrder, String realmName,
                          String title, String content) {
        this.huboid = huboid;
        this.pledgeOrder = pledgeOrder;
        this.realmName = realmName;
        this.title = title;
        this.content = content;
    }
}
