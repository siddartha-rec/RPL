package com.rpl.auction.auction.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;

@Data @NoArgsConstructor @AllArgsConstructor
public class BidRequest {
    @NotNull
    private Long teamId;
    /** Optional per-bid increment chosen by the auctioneer; falls back to the league increment when null. */
    private BigDecimal increment;
}
