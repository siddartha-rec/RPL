package com.rpl.auction.match.entity;

import com.rpl.auction.team.entity.Team;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "innings", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"match_id", "innings_number"})
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Innings {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "match_id", nullable = false)
    private Match match;

    @Column(name = "innings_number", nullable = false)
    private Integer inningsNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "batting_team_id", nullable = false)
    private Team battingTeam;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bowling_team_id", nullable = false)
    private Team bowlingTeam;

    @Column(name = "total_runs", nullable = false)
    @Builder.Default
    private Integer totalRuns = 0;

    @Column(nullable = false)
    @Builder.Default
    private Integer wickets = 0;

    @Column(precision = 4, scale = 1)
    private BigDecimal overs;

    @Column(nullable = false)
    @Builder.Default
    private Integer extras = 0;
}
