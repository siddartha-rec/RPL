package com.rpl.auction.league.entity;

import com.rpl.auction.tournament.entity.Tournament;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.Where;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "leagues")
@SQLDelete(sql = "UPDATE leagues SET archived = true WHERE id = ?")
@Where(clause = "archived = false")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class League {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 100)
    private String season;

    @Column(name = "season_display_name", length = 150)
    private String seasonDisplayName;

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
    private Integer minPlayersPerTeam = 15;

    @Column(nullable = false)
    @Builder.Default
    private Integer minWomenPerTeam = 2;

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

    @Column(name = "cricheroes_id", unique = true)
    private Long cricheroesId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tournament_id")
    private Tournament tournament;

    @Column(nullable = false)
    @Builder.Default
    private Boolean archived = false;

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
