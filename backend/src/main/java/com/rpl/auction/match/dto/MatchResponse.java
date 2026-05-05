package com.rpl.auction.match.dto;

import com.rpl.auction.match.entity.Innings;
import com.rpl.auction.match.entity.Match;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Data
@Builder
public class MatchResponse {
    private Long id;
    private Long cricheroesId;
    private Long leagueId;
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
    private String teamAScore;
    private Integer teamARuns;
    private Integer teamAWickets;
    private BigDecimal teamAOvers;

    private Long teamBId;
    private String teamBName;
    private String teamBShortName;
    private String teamBLogoUrl;
    private String teamBScore;
    private Integer teamBRuns;
    private Integer teamBWickets;
    private BigDecimal teamBOvers;

    private Long winnerTeamId;
    private String winnerTeamName;

    public static MatchResponse from(Match m, List<Innings> innings) {
        Innings ia = innings.stream().filter(i -> i.getBattingTeam().getId().equals(m.getTeamA().getId())).findFirst().orElse(null);
        Innings ib = innings.stream().filter(i -> i.getBattingTeam().getId().equals(m.getTeamB().getId())).findFirst().orElse(null);

        return MatchResponse.builder()
                .id(m.getId())
                .cricheroesId(m.getCricheroesId())
                .leagueId(m.getLeague().getId())
                .status(m.getStatus().name())
                .venue(m.getVenue())
                .format(m.getFormat())
                .overs(m.getOvers())
                .scheduledAt(m.getScheduledAt())
                .resultText(m.getResultText())
                .teamAId(m.getTeamA().getId())
                .teamAName(m.getTeamA().getName())
                .teamAShortName(m.getTeamA().getShortName())
                .teamALogoUrl(m.getTeamA().getLogoUrl())
                .teamARuns(ia != null ? ia.getTotalRuns() : null)
                .teamAWickets(ia != null ? ia.getWickets() : null)
                .teamAOvers(ia != null ? ia.getOvers() : null)
                .teamAScore(scoreStr(ia))
                .teamBId(m.getTeamB().getId())
                .teamBName(m.getTeamB().getName())
                .teamBShortName(m.getTeamB().getShortName())
                .teamBLogoUrl(m.getTeamB().getLogoUrl())
                .teamBRuns(ib != null ? ib.getTotalRuns() : null)
                .teamBWickets(ib != null ? ib.getWickets() : null)
                .teamBOvers(ib != null ? ib.getOvers() : null)
                .teamBScore(scoreStr(ib))
                .winnerTeamId(m.getWinnerTeam() != null ? m.getWinnerTeam().getId() : null)
                .winnerTeamName(m.getWinnerTeam() != null ? m.getWinnerTeam().getName() : null)
                .build();
    }

    private static String scoreStr(Innings i) {
        if (i == null) return null;
        return i.getTotalRuns() + "/" + i.getWickets()
                + (i.getOvers() != null ? " (" + i.getOvers().stripTrailingZeros().toPlainString() + ")" : "");
    }
}
