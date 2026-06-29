package com.rpl.auction.auction.dto;

import java.math.BigDecimal;
import lombok.Data;

@Data
public class UpdateRetentionRequest {
    private BigDecimal price;
}
