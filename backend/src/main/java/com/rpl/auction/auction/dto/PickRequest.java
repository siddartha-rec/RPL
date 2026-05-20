package com.rpl.auction.auction.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;
import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor
public class PickRequest {
    @NotNull
    private Long playerId;

    /**
     * Optional. When present, admin overrides the per-player retention price
     * instead of using league.retentionCost. Must be >= 0 and within team budget.
     * Ignored by draft pick.
     */
    @PositiveOrZero
    private BigDecimal price;

    /**
     * Optional. When present, admin picks for this team directly, bypassing the
     * round-robin `currentPickTeamId`. Ignored by draft pick.
     */
    private Long teamId;
}
