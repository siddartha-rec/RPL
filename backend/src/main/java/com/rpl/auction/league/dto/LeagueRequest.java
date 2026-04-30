package com.rpl.auction.league.dto;

import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;

@Data @NoArgsConstructor @AllArgsConstructor
public class LeagueRequest {
    @NotBlank
    private String name;
    @NotBlank
    private String season;
    @NotNull @DecimalMin("1.0")
    private BigDecimal teamBudget;
    @NotNull @Min(1)
    private Integer maxPlayersPerTeam;
    @Min(0)
    private Integer minPlayersPerTeam = 15;
    @Min(0)
    private Integer minWomenPerTeam = 2;
    @Min(0)
    private Integer maxRetentionsPerTeam = 0;
    @DecimalMin("0.0")
    private BigDecimal retentionCost = BigDecimal.ZERO;
    @NotNull @DecimalMin("0.1")
    private BigDecimal bidIncrement;
    @Min(5) @Max(120)
    private Integer timerSeconds = 30;
}
