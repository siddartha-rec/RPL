package com.rpl.auction.cricheroes.dto;

import java.util.List;

public record ScrapedTournament(
        Long cricheroesId,
        String name,
        String season,
        String cityName,
        String logo,
        List<Long> teamIds,
        List<ScrapedMatchSummary> matches
) {}
