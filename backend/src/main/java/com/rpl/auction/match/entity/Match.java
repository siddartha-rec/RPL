package com.rpl.auction.match.entity;

import com.rpl.auction.league.entity.League;
import com.rpl.auction.team.entity.Team;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
@Table(name = "matches", indexes = {
        @Index(name = "idx_match_league_date", columnList = "league_id, scheduled_at")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Match {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "league_id", nullable = false)
    private League league;

    @Column(name = "cricheroes_id", unique = true)
    private Long cricheroesId;

    @Column(name = "scheduled_at")
    private Instant scheduledAt;

    @Column(length = 200)
    private String venue;

    @Column(length = 20)
    private String format;

    private Integer overs;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private MatchStatus status = MatchStatus.SCHEDULED;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_a_id", nullable = false)
    private Team teamA;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_b_id", nullable = false)
    private Team teamB;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "winner_team_id")
    private Team winnerTeam;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "toss_winner_team_id")
    private Team tossWinnerTeam;

    @Enumerated(EnumType.STRING)
    @Column(name = "toss_decision", length = 10)
    private TossDecision tossDecision;

    @Column(name = "result_text", length = 200)
    private String resultText;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    public enum MatchStatus { SCHEDULED, LIVE, COMPLETED, ABANDONED }
    public enum TossDecision { BAT, BOWL }
}
