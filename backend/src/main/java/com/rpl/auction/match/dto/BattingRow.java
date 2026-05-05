package com.rpl.auction.match.dto;

import com.rpl.auction.match.entity.BattingPerformance;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class BattingRow {
    private Long playerId;
    private String playerName;
    private Integer position;
    private Integer runs;
    private Integer balls;
    private Integer fours;
    private Integer sixes;
    private BigDecimal strikeRate;
    private String dismissalText;

    public static BattingRow from(BattingPerformance bp) {
        return BattingRow.builder()
                .playerId(bp.getPlayer().getId())
                .playerName(bp.getPlayer().getName())
                .position(bp.getPosition())
                .runs(bp.getRuns())
                .balls(bp.getBalls())
                .fours(bp.getFours())
                .sixes(bp.getSixes())
                .strikeRate(bp.getStrikeRate())
                .dismissalText(bp.getDismissalText())
                .build();
    }
}
