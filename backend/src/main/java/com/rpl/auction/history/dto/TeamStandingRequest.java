package com.rpl.auction.history.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor
public class TeamStandingRequest {
    @NotNull
    private Long teamId;
    @NotNull
    private Integer rank;
    private Integer points;
    private String notes;
}
