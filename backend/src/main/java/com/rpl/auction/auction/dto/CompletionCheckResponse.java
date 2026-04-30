package com.rpl.auction.auction.dto;

import lombok.*;

import java.util.List;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class CompletionCheckResponse {
    private Long auctionId;
    private boolean canComplete;
    private Integer minPlayersPerTeam;
    private Integer minWomenPerTeam;
    private List<TeamShortfall> shortPlayers;
    private List<TeamShortfall> shortWomen;
    private boolean hasPlayerOnBlock;
    private String currentPlayerName;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class TeamShortfall {
        private Long teamId;
        private String teamName;
        private long current;
        private int required;
        private long missing;
    }
}
