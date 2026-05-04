package com.rpl.auction.cricheroes.dto;

import java.time.Instant;

public record ScrapedMatchSummary(
        Long cricheroesMatchId,
        String slug,
        Long teamAId,
        String teamAName,
        Long teamBId,
        String teamBName,
        Long winnerTeamId,
        String winningTeamName,
        String winBy,
        String groundName,
        Integer overs,
        String matchType,
        Instant startDateTime,
        String roundName
) {}
