package com.rpl.auction.match.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;

@Data
@Builder
public class MatchDetailResponse {
    private Long id;
    private Long cricheroesId;
    private Long leagueId;
    private String leagueName;
    private String status;
    private String venue;
    private String format;
    private Integer overs;
    private Instant scheduledAt;
    private String resultText;

    private Long teamAId;
    private String teamAName;
    private String teamAShortName;
    private String teamALogoUrl;

    private Long teamBId;
    private String teamBName;
    private String teamBShortName;
    private String teamBLogoUrl;

    private Long winnerTeamId;
    private String winnerTeamName;

    private List<InningsResponse> innings;
}
