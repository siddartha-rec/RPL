package com.rpl.auction.league.dto;

import com.rpl.auction.league.entity.League;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class LeagueResponse {
    private Long id;
    private String name;
    private String season;
    private String seasonDisplayName;
    private String status;
    private BigDecimal teamBudget;
    private Integer maxPlayersPerTeam;
    private Integer minPlayersPerTeam;
    private Integer minWomenPerTeam;
    private Integer maxRetentionsPerTeam;
    private BigDecimal retentionCost;
    private BigDecimal bidIncrement;
    private Integer timerSeconds;
    private Instant createdAt;
    private Instant updatedAt;

    public static LeagueResponse from(League league) {
        return LeagueResponse.builder()
                .id(league.getId())
                .name(league.getName())
                .season(league.getSeason())
                .seasonDisplayName(league.getSeasonDisplayName())
                .status(league.getStatus().name())
                .teamBudget(league.getTeamBudget())
                .maxPlayersPerTeam(league.getMaxPlayersPerTeam())
                .minPlayersPerTeam(league.getMinPlayersPerTeam())
                .minWomenPerTeam(league.getMinWomenPerTeam())
                .maxRetentionsPerTeam(league.getMaxRetentionsPerTeam())
                .retentionCost(league.getRetentionCost())
                .bidIncrement(league.getBidIncrement())
                .timerSeconds(league.getTimerSeconds())
                .createdAt(league.getCreatedAt())
                .updatedAt(league.getUpdatedAt())
                .build();
    }
}
