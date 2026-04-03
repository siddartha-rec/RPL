package com.rpl.auction.league.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "leagues")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class League {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 20)
    private String season;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private LeagueStatus status = LeagueStatus.SETUP;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal teamBudget;

    @Column(nullable = false)
    private Integer maxPlayersPerTeam;

    @Column(nullable = false)
    @Builder.Default
    private Integer maxRetentionsPerTeam = 0;

    @Column(precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal retentionCost = BigDecimal.ZERO;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal bidIncrement;

    @Column(nullable = false)
    @Builder.Default
    private Integer timerSeconds = 30;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    public enum LeagueStatus {
        SETUP, ACTIVE, COMPLETED
    }
}
