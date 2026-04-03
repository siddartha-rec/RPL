package com.rpl.auction.team.dto;

import com.rpl.auction.team.entity.Team;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class TeamResponse {
    private Long id;
    private String name;
    private String shortName;
    private String color;
    private String logoUrl;
    private Long captainId;
    private String captainName;
    private Long ownerId;
    private String ownerName;
    private Long leagueId;
    private BigDecimal budget;
    private BigDecimal budgetSpent;
    private Integer playerCount;
    private Instant createdAt;

    public static TeamResponse from(Team team) {
        return TeamResponse.builder()
                .id(team.getId())
                .name(team.getName())
                .shortName(team.getShortName())
                .color(team.getColor())
                .logoUrl(team.getLogoUrl())
                .captainId(team.getCaptainId())
                .ownerId(team.getOwner() != null ? team.getOwner().getId() : null)
                .ownerName(team.getOwner() != null ? team.getOwner().getDisplayName() : null)
                .leagueId(team.getLeague().getId())
                .budget(team.getBudget())
                .budgetSpent(team.getBudgetSpent())
                .createdAt(team.getCreatedAt())
                .build();
    }
}
