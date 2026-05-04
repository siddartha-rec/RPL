package com.rpl.auction.cricheroes.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class TeamImportRequest {
    @NotNull
    private Long cricheroesTeamId;
    @NotNull
    private Long leagueId;
}
