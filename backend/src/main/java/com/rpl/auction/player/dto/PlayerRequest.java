package com.rpl.auction.player.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.math.BigDecimal;

@Data @NoArgsConstructor @AllArgsConstructor
public class PlayerRequest {
    @NotBlank
    private String name;
    private Integer playerNumber;
    @NotNull
    private String category;
    private String role;
    private String gender;
    private BigDecimal basePrice = BigDecimal.ZERO;
    private Boolean isCaptain = false;
}
