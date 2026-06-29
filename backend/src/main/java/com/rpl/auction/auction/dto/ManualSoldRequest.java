package com.rpl.auction.auction.dto;

import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import lombok.Data;

@Data
public class ManualSoldRequest {
    @NotNull
    private Long teamId;
    @NotNull
    private BigDecimal price;
}
