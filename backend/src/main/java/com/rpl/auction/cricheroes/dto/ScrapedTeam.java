package com.rpl.auction.cricheroes.dto;

import java.util.List;

public record ScrapedTeam(
        Long cricheroesId,
        String name,
        String shortName,
        String logo,
        Long captainCricheroesId,
        List<ScrapedPlayer> players
) {}
