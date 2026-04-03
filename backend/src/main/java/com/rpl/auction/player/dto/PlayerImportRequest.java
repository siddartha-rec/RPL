package com.rpl.auction.player.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.*;
import java.util.List;

@Data @NoArgsConstructor @AllArgsConstructor
public class PlayerImportRequest {
    @NotEmpty
    private List<PlayerRequest> players;
}
