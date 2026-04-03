package com.rpl.auction.auction.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor
public class PickRequest {
    @NotNull
    private Long playerId;
}
