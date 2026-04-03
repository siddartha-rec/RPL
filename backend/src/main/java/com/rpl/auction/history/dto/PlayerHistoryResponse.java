package com.rpl.auction.history.dto;

import com.rpl.auction.history.entity.PlayerHistory;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class PlayerHistoryResponse {
    private Long id;
    private Long playerId;
    private Long leagueId;
    private String leagueName;
    private Long teamId;
    private String teamName;
    private String acquisitionType;
    private BigDecimal soldPrice;
    private Instant createdAt;

    public static PlayerHistoryResponse from(PlayerHistory history, String leagueName, String teamName) {
        return PlayerHistoryResponse.builder()
                .id(history.getId())
                .playerId(history.getPlayerId())
                .leagueId(history.getLeagueId())
                .leagueName(leagueName)
                .teamId(history.getTeamId())
                .teamName(teamName)
                .acquisitionType(history.getAcquisitionType().name())
                .soldPrice(history.getSoldPrice())
                .createdAt(history.getCreatedAt())
                .build();
    }
}
