package com.rpl.auction.cricheroes.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class MatchImportRequest {
    @NotNull
    private Long cricheroesMatchId;
    private String slug;
    @NotNull
    private Long leagueId;
    private boolean force;
}
