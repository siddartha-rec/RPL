package com.rpl.auction.match.dto;

import com.rpl.auction.match.entity.Innings;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
public class InningsResponse {
    private Long id;
    private Integer inningsNumber;
    private Long battingTeamId;
    private String battingTeamName;
    private String battingTeamShortName;
    private Long bowlingTeamId;
    private String bowlingTeamName;
    private String bowlingTeamShortName;
    private Integer totalRuns;
    private Integer wickets;
    private BigDecimal overs;
    private Integer extras;
    private List<BattingRow> batting;
    private List<BowlingRow> bowling;

    public static InningsResponse from(Innings i, List<BattingRow> batting, List<BowlingRow> bowling) {
        return InningsResponse.builder()
                .id(i.getId())
                .inningsNumber(i.getInningsNumber())
                .battingTeamId(i.getBattingTeam().getId())
                .battingTeamName(i.getBattingTeam().getName())
                .battingTeamShortName(i.getBattingTeam().getShortName())
                .bowlingTeamId(i.getBowlingTeam().getId())
                .bowlingTeamName(i.getBowlingTeam().getName())
                .bowlingTeamShortName(i.getBowlingTeam().getShortName())
                .totalRuns(i.getTotalRuns())
                .wickets(i.getWickets())
                .overs(i.getOvers())
                .extras(i.getExtras())
                .batting(batting)
                .bowling(bowling)
                .build();
    }
}
