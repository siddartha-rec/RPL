package com.rpl.auction.player.dto;

import com.rpl.auction.player.entity.Player;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class PlayerResponse {
    private Long id;
    private String name;
    private Integer playerNumber;
    private String category;
    private String role;
    private String gender;
    private BigDecimal basePrice;
    private BigDecimal soldPrice;
    private Long teamId;
    private String teamName;
    private String teamColor;
    private Long leagueId;
    private String status;
    private Boolean isCaptain;
    private Instant createdAt;

    public static PlayerResponse from(Player player) {
        return PlayerResponse.builder()
                .id(player.getId())
                .name(player.getName())
                .playerNumber(player.getPlayerNumber())
                .category(player.getCategory().name())
                .role(player.getRole())
                .gender(player.getGender() != null ? player.getGender().name() : null)
                .basePrice(player.getBasePrice())
                .soldPrice(player.getSoldPrice())
                .teamId(player.getTeam() != null ? player.getTeam().getId() : null)
                .teamName(player.getTeam() != null ? player.getTeam().getName() : null)
                .teamColor(player.getTeam() != null ? player.getTeam().getColor() : null)
                .leagueId(player.getLeague().getId())
                .status(player.getStatus().name())
                .isCaptain(player.getIsCaptain())
                .createdAt(player.getCreatedAt())
                .build();
    }
}
