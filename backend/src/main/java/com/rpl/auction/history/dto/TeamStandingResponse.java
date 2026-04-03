package com.rpl.auction.history.dto;

import com.rpl.auction.history.entity.TeamStanding;
import lombok.*;
import java.time.Instant;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class TeamStandingResponse {
    private Long id;
    private Long teamId;
    private String teamName;
    private Long leagueId;
    private String leagueName;
    private Integer rank;
    private Integer points;
    private String notes;
    private Instant createdAt;
    private Instant updatedAt;

    public static TeamStandingResponse from(TeamStanding standing, String leagueName, String teamName) {
        return TeamStandingResponse.builder()
                .id(standing.getId())
                .teamId(standing.getTeamId())
                .teamName(teamName)
                .leagueId(standing.getLeagueId())
                .leagueName(leagueName)
                .rank(standing.getRank())
                .points(standing.getPoints())
                .notes(standing.getNotes())
                .createdAt(standing.getCreatedAt())
                .updatedAt(standing.getUpdatedAt())
                .build();
    }
}
