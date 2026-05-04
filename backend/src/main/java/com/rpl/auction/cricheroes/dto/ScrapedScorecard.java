package com.rpl.auction.cricheroes.dto;

import java.time.Instant;
import java.util.List;

public record ScrapedScorecard(
        Long cricheroesMatchId,
        String matchType,
        Integer overs,
        String groundName,
        String cityName,
        Instant startDateTime,
        String winBy,
        String winningTeamName,
        String tournamentName,
        Long tournamentId,
        Long teamAId,
        String teamAName,
        Long teamBId,
        String teamBName,
        Long tossWinnerTeamId,
        String tossDecision,
        List<ScrapedInnings> innings
) {}
