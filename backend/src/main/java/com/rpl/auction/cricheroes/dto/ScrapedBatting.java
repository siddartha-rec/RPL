package com.rpl.auction.cricheroes.dto;

import java.math.BigDecimal;

public record ScrapedBatting(
        Long cricheroesPlayerId,
        String name,
        Integer position,
        Integer runs,
        Integer balls,
        Integer fours,
        Integer sixes,
        BigDecimal strikeRate,
        String howOut
) {}
