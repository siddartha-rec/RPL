package com.rpl.auction.tournament.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class TournamentRequest {
    @NotBlank
    @Size(max = 200)
    private String name;

    @Size(max = 200)
    private String slug;

    @Size(max = 500)
    private String logoUrl;

    @Size(max = 1000)
    private String description;
}
