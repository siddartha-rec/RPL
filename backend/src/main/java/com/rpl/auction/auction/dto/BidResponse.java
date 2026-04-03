package com.rpl.auction.auction.dto;

import com.rpl.auction.auction.entity.Bid;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class BidResponse {
    private Long id;
    private Long playerId;
    private Long teamId;
    private String teamName;
    private BigDecimal amount;
    private Integer bidOrder;
    private Boolean isWinning;
    private Instant createdAt;

    public static BidResponse from(Bid bid, String teamName) {
        return BidResponse.builder()
                .id(bid.getId())
                .playerId(bid.getPlayerId())
                .teamId(bid.getTeamId())
                .teamName(teamName)
                .amount(bid.getAmount())
                .bidOrder(bid.getBidOrder())
                .isWinning(bid.getIsWinning())
                .createdAt(bid.getCreatedAt())
                .build();
    }
}
