package com.rpl.auction.cricheroes.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TournamentImportCheckResponse {
    private boolean exists;
    private Long cricheroesId;
    private Long leagueId;
    private String leagueName;
    private String season;
    private String seasonDisplayName;
}
