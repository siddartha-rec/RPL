package com.rpl.auction.cricheroes.dto;

import java.math.BigDecimal;
import java.util.List;

public record ScrapedInnings(
        Integer inningNumber,
        Long battingTeamId,
        String battingTeamName,
        Integer totalRuns,
        Integer totalWickets,
        BigDecimal oversPlayed,
        Integer extras,
        List<ScrapedBatting> batting,
        List<ScrapedBowling> bowling
) {}
