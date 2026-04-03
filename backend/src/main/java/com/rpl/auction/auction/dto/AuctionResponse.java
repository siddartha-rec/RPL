package com.rpl.auction.auction.dto;

import com.rpl.auction.auction.entity.Auction;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class AuctionResponse {
    private Long id;
    private Long leagueId;
    private Auction.AuctionStatus status;
    private Long currentPlayerId;
    private String currentPlayerName;
    private BigDecimal currentBasePrice;
    private BigDecimal currentHighestBid;
    private String currentHighestBidTeam;
    private Integer timerSeconds;
    private Long currentPickTeamId;
    private String currentPickTeamName;
    private Instant createdAt;

    public static AuctionResponse from(Auction auction) {
        return AuctionResponse.builder()
                .id(auction.getId())
                .leagueId(auction.getLeagueId())
                .status(auction.getStatus())
                .currentPlayerId(auction.getCurrentPlayerId())
                .currentBasePrice(auction.getCurrentBasePrice())
                .timerSeconds(auction.getTimerSeconds())
                .currentPickTeamId(auction.getCurrentPickTeamId())
                .createdAt(auction.getCreatedAt())
                .build();
    }
}
