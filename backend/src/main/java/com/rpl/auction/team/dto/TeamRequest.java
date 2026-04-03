package com.rpl.auction.team.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor
public class TeamRequest {
    @NotBlank
    private String name;
    @NotBlank
    private String shortName;
    private String color;
    private String logoUrl;
    @NotNull
    private Long ownerId;
}
