package com.rpl.auction.cricheroes.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class TournamentImportRequest {
    @NotBlank
    private String tournamentUrl;
    private Long leagueId;
}
