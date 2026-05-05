package com.rpl.auction.match.dto;

import com.rpl.auction.match.entity.BowlingPerformance;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class BowlingRow {
    private Long playerId;
    private String playerName;
    private BigDecimal overs;
    private Integer maidens;
    private Integer runs;
    private Integer wickets;
    private BigDecimal economy;

    public static BowlingRow from(BowlingPerformance bp) {
        return BowlingRow.builder()
                .playerId(bp.getPlayer().getId())
                .playerName(bp.getPlayer().getName())
                .overs(bp.getOvers())
                .maidens(bp.getMaidens())
                .runs(bp.getRuns())
                .wickets(bp.getWickets())
                .economy(bp.getEconomy())
                .build();
    }
}
