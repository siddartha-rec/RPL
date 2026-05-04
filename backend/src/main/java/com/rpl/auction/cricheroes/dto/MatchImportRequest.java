package com.rpl.auction.cricheroes.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class MatchImportRequest {
    @NotNull
    private Long cricheroesMatchId;
    private String tournamentSlug;
    private String matchSlug;
    @NotNull
    private Long leagueId;
    private boolean force;
}
